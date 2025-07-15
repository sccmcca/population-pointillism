# convert geojson to pmtiles
input="./scripts/population_points.geojson"
output="./static/pop-points.pmtiles"

# tippecanoe -zg -o "$output" --drop-densest-as-needed --extend-zooms-if-still-dropping "$input" --force

# drop less
# tippecanoe -z15 -Z0 -o "$output" --no-feature-limit "$input" --force

tippecanoe \
  -z15 -Z0 \
  -o "$output" \
  --no-feature-limit \
  --no-tile-size-limit \
  --force \
  "$input"