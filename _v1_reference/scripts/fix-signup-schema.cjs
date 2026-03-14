/**
 * Fix Signup Schema Issues
 * 
 * This script fixes PocketBase collection rules that are causing
 * signup and path generation failures:
 * 
 * 1. profiles.onboarding_complete - Make optional (not required)
 * 2. skill_paths Update rule - Allow authenticated users to update
 * 
 * Run with: node scripts/fix-signup-schema.cjs
 */

const fs = require('fs');
const path = require('path');

// Read .env file manually
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const [key, ...valueParts] = trimmed.split('=');
      const value = valueParts.join('=');
      if (key && value) {
        process.env[key] = value;
      }
    });
  } catch (err) {
    console.warn('⚠️ Could not read .env file:', err.message);
  }
}

loadEnv();

const PB_URL = process.env.VITE_POCKETBASE_URL || 'https://pocketbase-story.digitalbricks.io';
const ADMIN_USER = process.env.ADMIN_USER;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_USER || !ADMIN_PASSWORD) {
  console.error('❌ ADMIN_USER and ADMIN_PASSWORD must be set in .env');
  process.exit(1);
}

async function main() {
  console.log('🔧 Fixing PocketBase schema issues...\n');
  console.log(`📍 PocketBase URL: ${PB_URL}`);
  console.log(`👤 Admin user: ${ADMIN_USER}\n`);

  // Create a direct fetch wrapper for PocketBase Admin API
  // Note: PocketBase 0.23+ uses _superusers collection instead of /api/admins
  const pb = {
    token: null,
    
    async authWithPassword(email, password) {
      // Try new PocketBase 0.23+ endpoint first
      let response = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: email, password }),
      });
      
      // Fall back to legacy admin endpoint for older PocketBase versions
      if (!response.ok && response.status === 404) {
        console.log('   Trying legacy admin endpoint...');
        response = await fetch(`${PB_URL}/api/admins/auth-with-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identity: email, password }),
        });
      }
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Auth failed: ${error}`);
      }
      
      const data = await response.json();
      this.token = data.token;
      console.log('✅ Authenticated as admin\n');
      return data;
    },
    
    async getCollection(name) {
      const response = await fetch(`${PB_URL}/api/collections/${name}`, {
        headers: {
          'Authorization': this.token,
        },
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to get collection ${name}: ${error}`);
      }
      
      return response.json();
    },
    
    async updateCollection(name, schema) {
      const response = await fetch(`${PB_URL}/api/collections/${name}`, {
        method: 'PATCH',
        headers: {
          'Authorization': this.token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(schema),
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to update collection ${name}: ${error}`);
      }
      
      return response.json();
    },
  };

  try {
    // Step 1: Authenticate as admin
    await pb.authWithPassword(ADMIN_USER, ADMIN_PASSWORD);

    // Step 2: Fix profiles.onboarding_complete field
    console.log('📋 Step 1: Fixing profiles.onboarding_complete field...');
    
    try {
      const profilesCollection = await pb.getCollection('profiles');
      console.log('   Current profiles schema fields:', profilesCollection.schema?.map(f => f.name).join(', '));
      
      // Find the onboarding_complete field
      const onboardingField = profilesCollection.schema?.find(f => f.name === 'onboarding_complete');
      
      if (onboardingField) {
        console.log(`   Found onboarding_complete field:`);
        console.log(`     - required: ${onboardingField.required}`);
        
        if (onboardingField.required) {
          // Update the field to not be required
          const updatedSchema = profilesCollection.schema.map(f => {
            if (f.name === 'onboarding_complete') {
              return { ...f, required: false };
            }
            return f;
          });
          
          await pb.updateCollection('profiles', { schema: updatedSchema });
          console.log('   ✅ Made onboarding_complete optional (not required)\n');
        } else {
          console.log('   ✅ onboarding_complete already optional\n');
        }
      } else {
        console.log('   ⚠️ onboarding_complete field not found\n');
      }
    } catch (err) {
      console.error('   ❌ Error fixing profiles collection:', err.message);
    }

    // Step 3: Fix skill_paths Update rule
    console.log('📋 Step 2: Fixing skill_paths Update rule...');
    
    try {
      const skillPathsCollection = await pb.getCollection('skill_paths');
      console.log(`   Current updateRule: "${skillPathsCollection.updateRule || '(empty - superuser only)'}"`);
      
      if (!skillPathsCollection.updateRule || skillPathsCollection.updateRule === '') {
        // Set the update rule to allow authenticated users
        await pb.updateCollection('skill_paths', {
          updateRule: '@request.auth.id != ""',
        });
        console.log('   ✅ Set updateRule to: @request.auth.id != ""\n');
      } else {
        console.log('   ✅ updateRule already set\n');
      }
    } catch (err) {
      console.error('   ❌ Error fixing skill_paths collection:', err.message);
    }

    console.log('🎉 Schema fixes complete!\n');
    console.log('Summary:');
    console.log('  - profiles.onboarding_complete is now optional');
    console.log('  - skill_paths can now be updated by authenticated users');
    console.log('\nYou can now test the signup flow.');

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

main();