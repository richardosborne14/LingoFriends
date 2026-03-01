/**
 * i18n Service - Lightweight internationalization
 * 
 * A simple key-value translation system for UI strings.
 * NOT using a heavy framework - this is intentionally minimal.
 * 
 * Features:
 * - JSON-based translation files per language
 * - Fallback to English for missing keys
 * - Simple string interpolation
 * - Lazy loading of translations
 * 
 * @see docs/phase-2-world-expansion/task-2.0.6-multilingual-i18n.md
 * @module services/i18n
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * Supported native languages for the UI.
 * Users select their native language during onboarding.
 */
export type NativeLanguage = 'en' | 'fr' | 'de' | 'es' | 'it' | 'pt';

/**
 * Translation dictionary - flat key-value pairs.
 */
export type TranslationDict = Record<string, string>;

/**
 * Interpolation values for dynamic translations.
 * Example: { name: "Max", count: 5 }
 */
export type InterpolationValues = Record<string, string | number>;

// ============================================================================
// TRANSLATION DATA
// ============================================================================

/**
 * English translations (base language).
 * All other languages fall back to this for missing keys.
 */
const translations_en: TranslationDict = {
  // === Navigation ===
  'nav.garden': 'My Garden',
  'nav.learn': 'Learn',
  'nav.path': 'Path',
  'nav.settings': 'Settings',
  'nav.profile': 'Profile',
  'nav.friends': 'Friends',
  'nav.shop': 'Shop',
  
  // === Authentication ===
  'auth.login': 'Sign In',
  'auth.logout': 'Sign Out',
  'auth.welcome': 'Welcome to LingoFriends!',
  'auth.continue': 'Continue',
  
  // === Onboarding ===
  'onboarding.step1.title': 'What would you like to learn?',
  'onboarding.step1.subtitle': 'Choose a language to start learning',
  'onboarding.step2.title': 'What are your interests?',
  'onboarding.step2.subtitle': 'We\'ll personalize your lessons',
  'onboarding.step3.title': 'How much do you know?',
  'onboarding.step3.subtitle': 'This helps us find the right starting point',
  'onboarding.complete': 'You\'re all set!',
  
  // === Garden ===
  'garden.title': 'My Garden',
  'garden.water': 'Water',
  'garden.health': 'Health',
  'garden.growth': 'Growth',
  'garden.empty': 'Your garden is empty',
  'garden.emptyHint': 'Start a new skill path to plant a tree!',
  'garden.newTree': 'New Tree',
  'garden.newTreeHint': 'Start a new language journey',
  
  // === Path View ===
  'path.title': 'Learning Path',
  'path.current': 'Current',
  'path.completed': 'Completed',
  'path.locked': 'Locked',
  'path.start': 'Start Lesson',
  'path.continue': 'Continue',
  'path.review': 'Review',
  'path.goal': 'Goal',
  
  // === Lesson ===
  'lesson.check': 'Check',
  'lesson.skip': 'Skip',
  'lesson.hint': 'Hint',
  'lesson.correct': 'Correct!',
  'lesson.incorrect': 'Not quite',
  'lesson.tryAgain': 'Try Again',
  'lesson.next': 'Next',
  'lesson.progress': 'Progress',
  'lesson.complete': 'Lesson Complete!',
  'lesson.earned': 'You earned',
  
  // === Activities ===
  'activity.multipleChoice.selectAnswer': 'Select your answer',
  'activity.fillBlank.completeSentence': 'Complete the sentence',
  'activity.translate.translatePhrase': 'Translate the phrase',
  'activity.matching.matchPairs': 'Match the pairs',
  'activity.wordArrange.arrangeWords': 'Arrange the words',
  'activity.trueFalse.statement': 'Is this statement true or false?',
  
  // === Rewards ===
  'reward.sunDrops': 'Sun Drops',
  'reward.stars': 'Stars',
  'reward.streak': 'Day Streak',
  'reward.newRecord': 'New Record!',
  
  // === Shop ===
  'shop.title': 'Garden Shop',
  'shop.trees': 'Trees',
  'shop.flowers': 'Flowers',
  'shop.furniture': 'Furniture',
  'shop.special': 'Special',
  'shop.buy': 'Buy',
  'shop.price': 'Price',
  'shop.owned': 'Owned',
  
  // === Friends ===
  'friends.title': 'Friends',
  'friends.add': 'Add Friend',
  'friends.code': 'Your Friend Code',
  'friends.enterCode': 'Enter Friend Code',
  'friends.pending': 'Pending',
  'friends.accept': 'Accept',
  'friends.decline': 'Decline',
  
  // === Gifts ===
  'gift.send': 'Send Gift',
  'gift.receive': 'Received Gift',
  'gift.open': 'Open',
  'gift.water': 'Water Drop',
  'gift.sparkle': 'Sparkle',
  
  // === Errors ===
  'error.generic': 'Something went wrong. Please try again.',
  'error.network': 'Connection lost. Check your internet.',
  'error.session': 'Session expired. Please sign in again.',
  
  // === Accessibility ===
  'a11y.close': 'Close',
  'a11y.back': 'Back',
  'a11y.next': 'Next',
  'a11y.submit': 'Submit',
  'a11y.loading': 'Loading...',
  'a11y.play': 'Play audio',
  'a11y.pause': 'Pause',
  
  // === World Map (Phase 2.0.11) ===
  'worldMap.subtitle': 'Explore the world around you',
  'worldMap.level': 'Level {{level}}',
  'worldMap.treesPlanted': '{{count}} trees',
  'worldMap.yourGarden': 'Your Garden',
  'worldMap.comingSoon': 'Coming soon!',
  'worldMap.comingFeatures': 'Coming Soon',
  'worldMap.inviteFriends': 'Invite Friends',
  'worldMap.inviteFriendsDesc': 'Share a friend code and learn together',
  'worldMap.voiceChat': 'Voice Chat',
  'worldMap.voiceChatDesc': 'Practice speaking with friends in real-time',
  'worldMap.watchFriends': 'Watch Friends Learn',
  'worldMap.watchFriendsDesc': 'See your friends progress in their gardens',
  'worldMap.footerHint': 'Multiplayer features coming in a future update!',
};

/**
 * French translations.
 */
const translations_fr: TranslationDict = {
  // === Navigation ===
  'nav.garden': 'Mon Jardin',
  'nav.learn': 'Apprendre',
  'nav.path': 'Parcours',
  'nav.settings': 'Paramètres',
  'nav.profile': 'Profil',
  'nav.friends': 'Amis',
  'nav.shop': 'Boutique',
  
  // === Authentication ===
  'auth.login': 'Se connecter',
  'auth.logout': 'Se déconnecter',
  'auth.welcome': 'Bienvenue à LingoFriends!',
  'auth.continue': 'Continuer',
  
  // === Onboarding ===
  'onboarding.step1.title': 'Que souhaitez-vous apprendre?',
  'onboarding.step1.subtitle': 'Choisissez une langue pour commencer',
  'onboarding.step2.title': 'Quels sont vos centres d\'intérêt?',
  'onboarding.step2.subtitle': 'Nous personnaliserons vos leçons',
  'onboarding.step3.title': 'Quel est votre niveau?',
  'onboarding.step3.subtitle': 'Cela nous aide à trouver le bon point de départ',
  'onboarding.complete': 'C\'est prêt!',
  
  // === Garden ===
  'garden.title': 'Mon Jardin',
  'garden.water': 'Arroser',
  'garden.health': 'Santé',
  'garden.growth': 'Croissance',
  'garden.empty': 'Votre jardin est vide',
  'garden.emptyHint': 'Commencez un nouveau parcours pour planter un arbre!',
  'garden.newTree': 'Nouvel Arbre',
  'garden.newTreeHint': 'Commencer une nouvelle langue',
  
  // === Path View ===
  'path.title': 'Parcours',
  'path.current': 'En cours',
  'path.completed': 'Terminé',
  'path.locked': 'Verrouillé',
  'path.start': 'Commencer',
  'path.continue': 'Continuer',
  'path.review': 'Réviser',
  'path.goal': 'Objectif',
  
  // === Lesson ===
  'lesson.check': 'Vérifier',
  'lesson.skip': 'Passer',
  'lesson.hint': 'Indice',
  'lesson.correct': 'Correct!',
  'lesson.incorrect': 'Pas tout à fait',
  'lesson.tryAgain': 'Réessayer',
  'lesson.next': 'Suivant',
  'lesson.progress': 'Progression',
  'lesson.complete': 'Leçon terminée!',
  'lesson.earned': 'Vous avez gagné',
  
  // === Activities ===
  'activity.multipleChoice.selectAnswer': 'Sélectionnez votre réponse',
  'activity.fillBlank.completeSentence': 'Complétez la phrase',
  'activity.translate.translatePhrase': 'Traduisez la phrase',
  'activity.matching.matchPairs': 'Associez les paires',
  'activity.wordArrange.arrangeWords': 'Remettez les mots dans l\'ordre',
  'activity.trueFalse.statement': 'Cette affirmation est-elle vraie ou fausse?',
  
  // === Rewards ===
  'reward.sunDrops': 'Gouttes de Soleil',
  'reward.stars': 'Étoiles',
  'reward.streak': 'Série de Jours',
  'reward.newRecord': 'Nouveau Record!',
  
  // === Shop ===
  'shop.title': 'Boutique',
  'shop.trees': 'Arbres',
  'shop.flowers': 'Fleurs',
  'shop.furniture': 'Mobilier',
  'shop.special': 'Spécial',
  'shop.buy': 'Acheter',
  'shop.price': 'Prix',
  'shop.owned': 'Possédé',
  
  // === Friends ===
  'friends.title': 'Amis',
  'friends.add': 'Ajouter un ami',
  'friends.code': 'Votre Code Ami',
  'friends.enterCode': 'Entrez le Code Ami',
  'friends.pending': 'En attente',
  'friends.accept': 'Accepter',
  'friends.decline': 'Refuser',
  
  // === Gifts ===
  'gift.send': 'Envoyer un Cadeau',
  'gift.receive': 'Cadeau Reçu',
  'gift.open': 'Ouvrir',
  'gift.water': 'Goutte d\'Eau',
  'gift.sparkle': 'Étincelle',
  
  // === Errors ===
  'error.generic': 'Une erreur s\'est produite. Veuillez réessayer.',
  'error.network': 'Connexion perdue. Vérifiez votre internet.',
  'error.session': 'Session expirée. Veuillez vous reconnecter.',
  
  // === Accessibility ===
  'a11y.close': 'Fermer',
  'a11y.back': 'Retour',
  'a11y.next': 'Suivant',
  'a11y.submit': 'Valider',
  'a11y.loading': 'Chargement...',
  'a11y.play': 'Écouter',
  'a11y.pause': 'Pause',
};

/**
 * German translations.
 */
const translations_de: TranslationDict = {
  // === Navigation ===
  'nav.garden': 'Mein Garten',
  'nav.learn': 'Lernen',
  'nav.path': 'Pfad',
  'nav.settings': 'Einstellungen',
  'nav.profile': 'Profil',
  'nav.friends': 'Freunde',
  'nav.shop': 'Laden',
  
  // === Authentication ===
  'auth.login': 'Anmelden',
  'auth.logout': 'Abmelden',
  'auth.welcome': 'Willkommen bei LingoFriends!',
  'auth.continue': 'Weiter',
  
  // === Onboarding ===
  'onboarding.step1.title': 'Was möchtest du lernen?',
  'onboarding.step1.subtitle': 'Wähle eine Sprache zum Beginnen',
  'onboarding.step2.title': 'Was sind deine Interessen?',
  'onboarding.step2.subtitle': 'Wir passen deine Lektionen an',
  'onboarding.step3.title': 'Wie viel weißt du?',
  'onboarding.step3.subtitle': 'Das hilft uns, den richtigen Startpunkt zu finden',
  'onboarding.complete': 'Du bist startklar!',
  
  // === Garden ===
  'garden.title': 'Mein Garten',
  'garden.water': 'Gießen',
  'garden.health': 'Gesundheit',
  'garden.growth': 'Wachstum',
  'garden.empty': 'Dein Garten ist leer',
  'garden.emptyHint': 'Starte einen neuen Pfad, um einen Baum zu pflanzen!',
  'garden.newTree': 'Neuer Baum',
  'garden.newTreeHint': 'Eine neue Sprache beginnen',
  
  // === Path View ===
  'path.title': 'Lernpfad',
  'path.current': 'Aktuell',
  'path.completed': 'Abgeschlossen',
  'path.locked': 'Gesperrt',
  'path.start': 'Lektion starten',
  'path.continue': 'Fortsetzen',
  'path.review': 'Wiederholen',
  'path.goal': 'Ziel',
  
  // === Lesson ===
  'lesson.check': 'Prüfen',
  'lesson.skip': 'Überspringen',
  'lesson.hint': 'Tipp',
  'lesson.correct': 'Richtig!',
  'lesson.incorrect': 'Nicht ganz',
  'lesson.tryAgain': 'Nochmal versuchen',
  'lesson.next': 'Weiter',
  'lesson.progress': 'Fortschritt',
  'lesson.complete': 'Lektion abgeschlossen!',
  'lesson.earned': 'Du hast verdient',
  
  // === Activities ===
  'activity.multipleChoice.selectAnswer': 'Wähle deine Antwort',
  'activity.fillBlank.completeSentence': 'Ergänze den Satz',
  'activity.translate.translatePhrase': 'Übersetze den Ausdruck',
  'activity.matching.matchPairs': 'Verbinde die Paare',
  'activity.wordArrange.arrangeWords': 'Ordne die Wörter',
  'activity.trueFalse.statement': 'Ist diese Aussage wahr oder falsch?',
  
  // === Rewards ===
  'reward.sunDrops': 'Sonnentropfen',
  'reward.stars': 'Sterne',
  'reward.streak': 'Tage in Folge',
  'reward.newRecord': 'Neuer Rekord!',
  
  // === Shop ===
  'shop.title': 'Gartenladen',
  'shop.trees': 'Bäume',
  'shop.flowers': 'Blumen',
  'shop.furniture': 'Möbel',
  'shop.special': 'Besonderes',
  'shop.buy': 'Kaufen',
  'shop.price': 'Preis',
  'shop.owned': 'Im Besitz',
  
  // === Friends ===
  'friends.title': 'Freunde',
  'friends.add': 'Freund hinzufügen',
  'friends.code': 'Dein Freundescode',
  'friends.enterCode': 'Code eingeben',
  'friends.pending': 'Ausstehend',
  'friends.accept': 'Akzeptieren',
  'friends.decline': 'Ablehnen',
  
  // === Gifts ===
  'gift.send': 'Geschenk senden',
  'gift.receive': 'Geschenk erhalten',
  'gift.open': 'Öffnen',
  'gift.water': 'Wassertropfen',
  'gift.sparkle': 'Funkeln',
  
  // === Errors ===
  'error.generic': 'Etwas ist schiefgelaufen. Bitte versuche es erneut.',
  'error.network': 'Verbindung verloren. Prüfe deine Internetverbindung.',
  'error.session': 'Sitzung abgelaufen. Bitte melde dich erneut an.',
  
  // === Accessibility ===
  'a11y.close': 'Schließen',
  'a11y.back': 'Zurück',
  'a11y.next': 'Weiter',
  'a11y.submit': 'Absenden',
  'a11y.loading': 'Laden...',
  'a11y.play': 'Audio abspielen',
  'a11y.pause': 'Pause',
};

/**
 * Spanish translations.
 */
const translations_es: TranslationDict = {
  // === Navigation ===
  'nav.garden': 'Mi Jardín',
  'nav.learn': 'Aprender',
  'nav.path': 'Camino',
  'nav.settings': 'Ajustes',
  'nav.profile': 'Perfil',
  'nav.friends': 'Amigos',
  'nav.shop': 'Tienda',
  
  // === Authentication ===
  'auth.login': 'Iniciar sesión',
  'auth.logout': 'Cerrar sesión',
  'auth.welcome': '¡Bienvenido a LingoFriends!',
  'auth.continue': 'Continuar',
  
  // === Garden ===
  'garden.title': 'Mi Jardín',
  'garden.water': 'Regar',
  'garden.health': 'Salud',
  'garden.growth': 'Crecimiento',
  'garden.empty': 'Tu jardín está vacío',
  
  // === Path View ===
  'path.title': 'Camino de Aprendizaje',
  'path.current': 'Actual',
  'path.completed': 'Completado',
  'path.locked': 'Bloqueado',
  'path.start': 'Empezar lección',
  
  // === Lesson ===
  'lesson.check': 'Comprobar',
  'lesson.skip': 'Saltar',
  'lesson.hint': 'Pista',
  'lesson.correct': '¡Correcto!',
  'lesson.incorrect': 'No exactamente',
  'lesson.tryAgain': 'Inténtalo de nuevo',
  'lesson.next': 'Siguiente',
  'lesson.complete': '¡Lección completada!',
  
  // === Rewards ===
  'reward.sunDrops': 'Gotas de Sol',
  'reward.stars': 'Estrellas',
  'reward.streak': 'Días consecutivos',
  
  // === Errors ===
  'error.generic': 'Algo salió mal. Por favor, inténtalo de nuevo.',
  'error.network': 'Conexión perdida. Comprueba tu internet.',
  
  // === Accessibility ===
  'a11y.close': 'Cerrar',
  'a11y.back': 'Atrás',
  'a11y.next': 'Siguiente',
  'a11y.loading': 'Cargando...',
};

/**
 * Italian translations.
 */
const translations_it: TranslationDict = {
  // === Navigation ===
  'nav.garden': 'Il Mio Giardino',
  'nav.learn': 'Impara',
  'nav.path': 'Percorso',
  'nav.settings': 'Impostazioni',
  'nav.profile': 'Profilo',
  'nav.friends': 'Amici',
  'nav.shop': 'Negozio',
  
  // === Authentication ===
  'auth.login': 'Accedi',
  'auth.logout': 'Esci',
  'auth.welcome': 'Benvenuto in LingoFriends!',
  'auth.continue': 'Continua',
  
  // === Garden ===
  'garden.title': 'Il Mio Giardino',
  'garden.water': 'Innaffia',
  'garden.health': 'Salute',
  'garden.growth': 'Crescita',
  'garden.empty': 'Il tuo giardino è vuoto',
  
  // === Path View ===
  'path.title': 'Percorso',
  'path.current': 'Attuale',
  'path.completed': 'Completato',
  'path.locked': 'Bloccato',
  'path.start': 'Inizia lezione',
  
  // === Lesson ===
  'lesson.check': 'Controlla',
  'lesson.skip': 'Salta',
  'lesson.hint': 'Suggerimento',
  'lesson.correct': 'Corretto!',
  'lesson.incorrect': 'Non proprio',
  'lesson.complete': 'Lezione completata!',
  
  // === Errors ===
  'error.generic': 'Qualcosa è andato storto. Riprova.',
  
  // === Accessibility ===
  'a11y.close': 'Chiudi',
  'a11y.loading': 'Caricamento...',
};

/**
 * Portuguese translations.
 */
const translations_pt: TranslationDict = {
  // === Navigation ===
  'nav.garden': 'Meu Jardim',
  'nav.learn': 'Aprender',
  'nav.path': 'Caminho',
  'nav.settings': 'Configurações',
  'nav.profile': 'Perfil',
  'nav.friends': 'Amigos',
  'nav.shop': 'Loja',
  
  // === Authentication ===
  'auth.login': 'Entrar',
  'auth.logout': 'Sair',
  'auth.welcome': 'Bem-vindo ao LingoFriends!',
  'auth.continue': 'Continuar',
  
  // === Garden ===
  'garden.title': 'Meu Jardim',
  'garden.water': 'Regar',
  'garden.health': 'Saúde',
  'garden.growth': 'Crescimento',
  'garden.empty': 'Seu jardim está vazio',
  
  // === Path View ===
  'path.title': 'Caminho de Aprendizado',
  'path.current': 'Atual',
  'path.completed': 'Completado',
  'path.locked': 'Bloqueado',
  'path.start': 'Começar lição',
  
  // === Lesson ===
  'lesson.check': 'Verificar',
  'lesson.skip': 'Pular',
  'lesson.hint': 'Dica',
  'lesson.correct': 'Correto!',
  'lesson.incorrect': 'Não exatamente',
  'lesson.complete': 'Lição completada!',
  
  // === Errors ===
  'error.generic': 'Algo deu errado. Por favor, tente novamente.',
  
  // === Accessibility ===
  'a11y.close': 'Fechar',
  'a11y.loading': 'Carregando...',
};

// ============================================================================
// I18N SERVICE
// ============================================================================

/**
 * All translation dictionaries keyed by language code.
 */
const TRANSLATIONS: Record<NativeLanguage, TranslationDict> = {
  en: translations_en,
  fr: translations_fr,
  de: translations_de,
  es: translations_es,
  it: translations_it,
  pt: translations_pt,
};

/**
 * Current language state.
 * Defaults to English, updated from user profile.
 */
let currentLanguage: NativeLanguage = 'en';

/**
 * Listeners for language changes.
 */
const listeners: Set<() => void> = new Set();

/**
 * Set the current UI language.
 * Notifies all listeners to re-render.
 * 
 * @param lang - Language code (en, fr, de, es, it, pt)
 */
export function setLanguage(lang: NativeLanguage): void {
  if (lang === currentLanguage) return;
  
  if (!TRANSLATIONS[lang]) {
    console.warn(`[i18n] Unknown language "${lang}", falling back to English`);
    lang = 'en';
  }
  
  currentLanguage = lang;
  listeners.forEach(listener => listener());
  
  console.log(`[i18n] Language set to ${lang}`);
}

/**
 * Get the current UI language.
 */
export function getLanguage(): NativeLanguage {
  return currentLanguage;
}

/**
 * Get a translated string for a key.
 * Falls back to English if key not found in current language.
 * Falls back to the key itself if not found anywhere.
 * 
 * Supports interpolation with {{variable}} syntax.
 * 
 * @param key - Translation key (e.g., 'nav.garden')
 * @param values - Optional interpolation values
 * @returns Translated string
 * 
 * @example
 * t('lesson.earned', { count: 5 });
 * // Returns "You earned 5" (English) or "Vous avez gagné 5" (French)
 */
export function t(key: string, values?: InterpolationValues): string {
  // Try current language first
  let translation = TRANSLATIONS[currentLanguage]?.[key];
  
  // Fallback to English if not found
  if (!translation) {
    translation = translations_en[key];
    
    if (!translation) {
      console.warn(`[i18n] Missing translation key: "${key}"`);
      return key; // Return key as last resort
    }
  }
  
  // Interpolate values
  if (values) {
    Object.entries(values).forEach(([k, v]) => {
      translation = translation!.replace(new RegExp(`{{${k}}}`, 'g'), String(v));
    });
  }
  
  return translation;
}

/**
 * Subscribe to language changes.
 * Returns unsubscribe function.
 * 
 * @param listener - Callback when language changes
 * @returns Unsubscribe function
 */
export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Check if a language is supported.
 */
export function isLanguageSupported(lang: string): lang is NativeLanguage {
  return lang in TRANSLATIONS;
}

/**
 * Get all supported languages with their display names.
 */
export function getSupportedLanguages(): Array<{ code: NativeLanguage; name: string }> {
  return [
    { code: 'en', name: 'English' },
    { code: 'fr', name: 'Français' },
    { code: 'de', name: 'Deutsch' },
    { code: 'es', name: 'Español' },
    { code: 'it', name: 'Italiano' },
    { code: 'pt', name: 'Português' },
  ];
}

// Export the i18n object for convenience
export const i18n = {
  t,
  setLanguage,
  getLanguage,
  subscribe,
  isLanguageSupported,
  getSupportedLanguages,
};

export default i18n;