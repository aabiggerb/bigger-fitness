#!/bin/bash
# Script para descargar GIFs de ejercicios faltantes
# Fuente: musclewiki.com y fitnessprogramer.com (imágenes educativas)
cd /Users/arturobigger/Projects/Secret/assets/gifs

dl() {
  local name="$1"
  local url="$2"
  if [ -f "$name" ]; then
    echo "SKIP $name (ya existe)"
    return
  fi
  curl -s -L -o "$name" "$url"
  local size=$(stat -f%z "$name" 2>/dev/null || echo 0)
  if [ "$size" -gt 5000 ]; then
    echo "OK   $name ($(($size/1024))KB)"
  else
    rm -f "$name"
    echo "FAIL $name"
  fi
}

echo "=== Descargando GIFs de ejercicios faltantes ==="
echo ""

# ─── PECHO ───────────────────────────────────
echo "── Pecho ──"
dl "decline-bench-press.gif" "https://fitnessprogramer.com/wp-content/uploads/2021/02/Decline-Barbell-Bench-Press.gif"
dl "dumbbell-incline-press.gif" "https://fitnessprogramer.com/wp-content/uploads/2021/02/Incline-Dumbbell-Press.gif"
dl "dumbbell-fly.gif" "https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Fly.gif"
dl "incline-dumbbell-fly.gif" "https://fitnessprogramer.com/wp-content/uploads/2021/02/Incline-dumbbell-Fly.gif"
dl "cable-crossover.gif" "https://fitnessprogramer.com/wp-content/uploads/2021/02/Cable-Crossover.gif"
dl "chest-dip.gif" "https://fitnessprogramer.com/wp-content/uploads/2021/02/Chest-Dip.gif"
dl "dumbbell-pullover.gif" "https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Pullover.gif"
dl "machine-chest-press.gif" "https://fitnessprogramer.com/wp-content/uploads/2021/02/Machine-Chest-Press.gif"
dl "pec-deck-fly.gif" "https://fitnessprogramer.com/wp-content/uploads/2021/02/Pec-Deck-Fly.gif"
dl "diamond-push-up.gif" "https://fitnessprogramer.com/wp-content/uploads/2021/02/Diamond-Push-up.gif"

# ─── ESPALDA ─────────────────────────────────
echo "── Espalda ──"
dl "dumbbell-row.gif" "https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Row.gif"
dl "lat-pulldown-behind-neck.gif" "https://fitnessprogramer.com/wp-content/uploads/2021/02/Lat-Pulldown.gif"
dl "seated-cable-row.gif" "https://fitnessprogramer.com/wp-content/uploads/2021/02/Seated-Cable-Row.gif"
dl "t-bar-row.gif" "https://fitnessprogramer.com/wp-content/uploads/2021/02/T-Bar-Row.gif"
dl "chin-up.gif" "https://fitnessprogramer.com/wp-content/uploads/2021/06/Chin-Up.gif"
dl "sumo-deadlift.gif" "https://fitnessprogramer.com/wp-content/uploads/2021/02/Sumo-Deadlift.gif"
dl "hyperextension.gif" "https://fitnessprogramer.com/wp-content/uploads/2021/02/Hyperextension.gif"
dl "face-pull.gif" "https://fitnessprogramer.com/wp-content/uploads/2021/02/Face-Pull.gif"
dl "barbell-shrug.gif" "https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Shrug.gif"

# ─── HOMBROS ─────────────────────────────────
echo "── Hombros ──"
dl "arnold-press.gif" "https://fitnessprogramer.com/wp-content/uploads/2021/02/Arnold-Press.gif"
dl "front-raise.gif" "https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Front-Raise.gif"
dl "reverse-fly.gif" "https://fitnessprogramer.com/wp-content/uploads/2021/02/Rear-Delt-Fly.gif"
dl "cable-lateral-raise.gif" "https://fitnessprogramer.com/wp-content/uploads/2021/02/Cable-Lateral-Raise.gif"
dl "upright-row.gif" "https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Upright-Row.gif"

# ─── BÍCEPS ──────────────────────────────────
echo "── Bíceps ──"
dl "ez-bar-curl.gif" "https://fitnessprogramer.com/wp-content/uploads/2021/02/EZ-Barbell-Curl.gif"
dl "concentration-curl.gif" "https://fitnessprogramer.com/wp-content/uploads/2021/02/Concentration-Curl.gif"
dl "preacher-curl.gif" "https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Preacher-Curl.gif"
dl "cable-curl.gif" "https://fitnessprogramer.com/wp-content/uploads/2021/02/Cable-Curl.gif"
dl "incline-dumbbell-curl.gif" "https://fitnessprogramer.com/wp-content/uploads/2021/02/Incline-Dumbbell-Curl.gif"
dl "spider-curl.gif" "https://fitnessprogramer.com/wp-content/uploads/2021/02/Spider-Curl.gif"

# ─── TRÍCEPS ──────────────────────────────────
echo "── Tríceps ──"
dl "skull-crusher.gif" "https://fitnessprogramer.com/wp-content/uploads/2021/02/Lying-Triceps-Extension.gif"
dl "overhead-tricep-extension.gif" "https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-One-Arm-Triceps-Extension.gif"
dl "tricep-kickback.gif" "https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Kickback.gif"
dl "close-grip-bench.gif" "https://fitnessprogramer.com/wp-content/uploads/2021/02/Close-Grip-Bench-Press.gif"
dl "rope-pushdown.gif" "https://fitnessprogramer.com/wp-content/uploads/2021/02/Rope-Pushdown.gif"

# ─── PIERNAS ─────────────────────────────────
echo "── Piernas ──"
dl "front-squat.gif" "https://fitnessprogramer.com/wp-content/uploads/2021/02/Front-Squat.gif"
dl "bulgarian-split-squat.gif" "https://fitnessprogramer.com/wp-content/uploads/2021/02/Bulgarian-Split-Squat.gif"
dl "leg-press.gif" "https://fitnessprogramer.com/wp-content/uploads/2021/02/Leg-Press.gif"
dl "leg-extension.gif" "https://fitnessprogramer.com/wp-content/uploads/2021/02/Leg-Extension.gif"
dl "leg-curl.gif" "https://fitnessprogramer.com/wp-content/uploads/2021/02/Leg-Curl.gif"
dl "hack-squat.gif" "https://fitnessprogramer.com/wp-content/uploads/2021/02/Hack-Squat.gif"
dl "step-up.gif" "https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Step-Up.gif"
dl "goblet-squat.gif" "https://fitnessprogramer.com/wp-content/uploads/2021/02/Goblet-Squat.gif"
dl "hip-adduction.gif" "https://fitnessprogramer.com/wp-content/uploads/2021/02/Hip-Adduction-Machine.gif"
dl "hip-abduction.gif" "https://fitnessprogramer.com/wp-content/uploads/2021/02/Hip-Abduction-Machine.gif"

# ─── GLÚTEOS ──────────────────────────────────
echo "── Glúteos ──"
dl "glute-bridge.gif" "https://fitnessprogramer.com/wp-content/uploads/2021/02/Glute-Bridge.gif"
dl "cable-kickback.gif" "https://fitnessprogramer.com/wp-content/uploads/2021/02/Cable-Kickback.gif"
dl "good-morning.gif" "https://fitnessprogramer.com/wp-content/uploads/2021/02/Good-Morning.gif"

# ─── PANTORRILLAS ─────────────────────────────
echo "── Pantorrillas ──"
dl "standing-calf-raise.gif" "https://fitnessprogramer.com/wp-content/uploads/2021/02/Standing-Calf-Raise.gif"
dl "seated-calf-raise.gif" "https://fitnessprogramer.com/wp-content/uploads/2021/02/Seated-Calf-Raise.gif"
dl "leg-press-calf-raise.gif" "https://fitnessprogramer.com/wp-content/uploads/2021/02/Calf-Press.gif"

# ─── CORE ────────────────────────────────────
echo "── Core ──"
dl "plank.gif" "https://fitnessprogramer.com/wp-content/uploads/2021/02/Front-Plank.gif"
dl "crunch.gif" "https://fitnessprogramer.com/wp-content/uploads/2021/02/Crunch.gif"
dl "hanging-leg-raise.gif" "https://fitnessprogramer.com/wp-content/uploads/2021/02/Hanging-Leg-Raise.gif"
dl "russian-twist.gif" "https://fitnessprogramer.com/wp-content/uploads/2021/02/Russian-Twist.gif"
dl "ab-wheel.gif" "https://fitnessprogramer.com/wp-content/uploads/2021/02/Ab-Wheel-Rollout.gif"
dl "mountain-climber.gif" "https://fitnessprogramer.com/wp-content/uploads/2021/02/Mountain-Climber.gif"
dl "cable-crunch.gif" "https://fitnessprogramer.com/wp-content/uploads/2021/02/Cable-Crunch.gif"
dl "side-plank.gif" "https://fitnessprogramer.com/wp-content/uploads/2021/02/Side-Plank.gif"
dl "dead-bug.gif" "https://fitnessprogramer.com/wp-content/uploads/2021/02/Dead-Bug.gif"
dl "pallof-press.gif" "https://fitnessprogramer.com/wp-content/uploads/2021/02/Pallof-Press.gif"

# ─── ANTEBRAZOS ──────────────────────────────
echo "── Antebrazos ──"
dl "wrist-curl.gif" "https://fitnessprogramer.com/wp-content/uploads/2021/02/Wrist-Curl.gif"
dl "reverse-wrist-curl.gif" "https://fitnessprogramer.com/wp-content/uploads/2021/02/Reverse-Wrist-Curl.gif"
dl "farmer-walk.gif" "https://fitnessprogramer.com/wp-content/uploads/2021/02/Farmer-Walk.gif"

# ─── CUERPO COMPLETO ─────────────────────────
echo "── Cuerpo Completo ──"
dl "clean-and-press.gif" "https://fitnessprogramer.com/wp-content/uploads/2021/06/Barbell-Clean-and-Press.gif"
dl "snatch.gif" "https://fitnessprogramer.com/wp-content/uploads/2021/06/Power-Snatch.gif"
dl "turkish-get-up.gif" "https://fitnessprogramer.com/wp-content/uploads/2021/06/Turkish-Get-Up.gif"
dl "thruster.gif" "https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Thruster.gif"
dl "man-maker.gif" "https://fitnessprogramer.com/wp-content/uploads/2021/06/Man-Maker.gif"

# ─── CARDIO ──────────────────────────────────
echo "── Cardio ──"
dl "burpee.gif" "https://fitnessprogramer.com/wp-content/uploads/2021/02/Burpee.gif"
dl "box-jump.gif" "https://fitnessprogramer.com/wp-content/uploads/2021/02/Box-Jump.gif"
dl "kettlebell-swing.gif" "https://fitnessprogramer.com/wp-content/uploads/2021/02/Kettlebell-Swing.gif"
dl "battle-ropes.gif" "https://fitnessprogramer.com/wp-content/uploads/2021/02/Battle-Rope.gif"
dl "jumping-jacks.gif" "https://fitnessprogramer.com/wp-content/uploads/2021/02/Jumping-Jack.gif"
dl "sled-push.gif" "https://fitnessprogramer.com/wp-content/uploads/2021/06/Sled-Push.gif"

echo ""
echo "=== Resultado ==="
echo "GIFs descargados:"
ls -1 *.gif 2>/dev/null | wc -l
echo "Tamaño total:"
du -sh . 2>/dev/null
