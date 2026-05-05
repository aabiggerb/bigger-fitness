#!/bin/bash
cd /Users/arturobigger/Projects/Secret/assets/icons/exercises

# Función para descargar con verificación
dl() {
  local name="$1"
  local url="$2"
  curl -s -L -o "$name" "$url"
  local type=$(file -b "$name" 2>/dev/null | head -c 3)
  if [ "$type" = "PNG" ] || [ "$type" = "Web" ] || [ "$type" = "GIF" ]; then
    echo "OK $name"
  else
    rm -f "$name"
    echo "FAIL $name"
  fi
}

# Imágenes de ejercicios de fitnessprogramer (thumbnails PNG)
dl "bench-press.png" "https://fitnessprogramer.com/wp-content/uploads/2021/02/Bench-Press.png"
dl "incline-bench-press.png" "https://fitnessprogramer.com/wp-content/uploads/2021/02/Incline-Bench-Press.png"
dl "dumbbell-press.png" "https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Press.png"
dl "push-up.png" "https://fitnessprogramer.com/wp-content/uploads/2021/02/Push-Up.png"
dl "pull-up.png" "https://fitnessprogramer.com/wp-content/uploads/2021/02/Pull-Up.png"
dl "deadlift.png" "https://fitnessprogramer.com/wp-content/uploads/2021/02/Deadlift.png"
dl "barbell-row.png" "https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Row.png"
dl "lat-pulldown.png" "https://fitnessprogramer.com/wp-content/uploads/2021/02/Lat-Pulldown.png"
dl "overhead-press.png" "https://fitnessprogramer.com/wp-content/uploads/2021/02/Overhead-Press.png"
dl "shoulder-press.png" "https://fitnessprogramer.com/wp-content/uploads/2021/02/Shoulder-Press.png"
dl "lateral-raise.png" "https://fitnessprogramer.com/wp-content/uploads/2021/02/Lateral-Raise.png"
dl "bicep-curl.png" "https://fitnessprogramer.com/wp-content/uploads/2021/02/Bicep-Curl.png"
dl "barbell-curl.png" "https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Curl.png"
dl "hammer-curl.png" "https://fitnessprogramer.com/wp-content/uploads/2021/02/Hammer-Curl.png"
dl "dips.png" "https://fitnessprogramer.com/wp-content/uploads/2021/02/Dips.png"
dl "tricep-pushdown.png" "https://fitnessprogramer.com/wp-content/uploads/2021/02/Tricep-Pushdown.png"
dl "squat.png" "https://fitnessprogramer.com/wp-content/uploads/2021/02/Squat.png"
dl "lunges.png" "https://fitnessprogramer.com/wp-content/uploads/2021/02/Lunges.png"
dl "hip-thrust.png" "https://fitnessprogramer.com/wp-content/uploads/2021/02/Hip-Thrust.png"
dl "plank.png" "https://fitnessprogramer.com/wp-content/uploads/2021/02/Plank.png"
dl "burpee.png" "https://fitnessprogramer.com/wp-content/uploads/2021/02/Burpee.png"

echo "--- Resultado ---"
ls -la *.png 2>/dev/null | wc -l
