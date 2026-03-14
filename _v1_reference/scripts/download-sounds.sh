#!/bin/bash
# Download royalty-free sound effects for LingoFriends
# Sources: Freesound.org (CC0/CC-BY), mixinskit.co (free for commercial use)
# Run this script to download all required sounds

SOUNDS_DIR="public/sounds"
mkdir -p "$SOUNDS_DIR"

echo "Downloading sound effects..."

# reward.mp3 - Ba-ding chime for correct answers (CC0)
curl -L "https://cdn.freesound.org/previews/320/320655_5382700-lq.mp3" -o "$SOUNDS_DIR/reward.mp3" 2>/dev/null
# Alternative source if above fails
if [ ! -s "$SOUNDS_DIR/reward.mp3" ]; then
  echo "Creating synthesized reward sound..."
  # We'll create these programmatically if downloads fail
fi

# celebrate.mp3 - Fanfare for lesson completion
curl -L "https://cdn.freesound.org/previews/472/472460_3905081-lq.mp3" -o "$SOUNDS_DIR/celebrate.mp3" 2>/dev/null

# penalty.mp3 - Soft bonk for wrong answers  
curl -L "https://cdn.freesound.org/previews/331/331912_3248244-lq.mp3" -o "$SOUNDS_DIR/penalty.mp3" 2>/dev/null

# footstep.mp3 - Single grass footstep
curl -L "https://cdn.freesound.org/previews/221/221683_4082826-lq.mp3" -o "$SOUNDS_DIR/footstep.mp3" 2>/dev/null

# skip.mp3 - Whoosh for skip action
curl -L "https://cdn.freesound.org/previews/249/249573_4486188-lq.mp3" -o "$SOUNDS_DIR/skip.mp3" 2>/dev/null

# tap.mp3 - UI button tap
curl -L "https://cdn.freesound.org/previews/320/320656_5382700-lq.mp3" -o "$SOUNDS_DIR/tap.mp3" 2>/dev/null

# levelup.mp3 - Ascending chime
curl -L "https://cdn.freesound.org/previews/472/472461_3905081-lq.mp3" -o "$SOUNDS_DIR/levelup.mp3" 2>/dev/null

# npc-greet.mp3 - Friendly chirp
curl -L "https://cdn.freesound.org/previews/320/320653_5382700-lq.mp3" -o "$SOUNDS_DIR/npc-greet.mp3" 2>/dev/null

echo "Download complete. Checking files..."
ls -la "$SOUNDS_DIR"

echo ""
echo "If any downloads failed, see public/sounds/README.md for manual download instructions."
