<script>
    import { onMount } from "svelte";
    import { base } from "$app/paths";
    import maplibregl from "maplibre-gl";
    import "maplibre-gl/dist/maplibre-gl.css";
    import { MapboxOverlay } from "@deck.gl/mapbox";
    import { PointCloudLayer } from "@deck.gl/layers";
    import Papa from "papaparse";

    import "../assets/styles.css";

    const CSV_URL = `${base}/pop-points-with-gender.csv`;

    // Current field to color by - moved outside onMount so it's reactive
    let currentField = "density";
    let deckOverlay;
    let pointData = [];
    let showBasemap = true;

    // Define color schemes for different fields
    const colorSchemes = {
                density: "custom",

        gender: {
            m: [0, 255, 255], // Electric cyan
            f: [255, 20, 255], // Electric magenta
            default: [220, 220, 220], // Very light gray
        },
        age: {
            young: [0, 255, 0], // Green
            middle: [255, 255, 0], // Yellow
            old: [255, 0, 0], // Red
            default: [128, 128, 128],
        },
    };

    // Function to create the point cloud layer
    function createPointCloudLayer() {
        return new PointCloudLayer({
            id: `point-cloud-layer-${currentField}`, // Change ID to force re-render
            data: pointData,
            getPosition: (d) => [
                d.coordinates[0],
                d.coordinates[1],
                (d.height || 0) ** 2 * 4000 - 100,
            ],
            getColor: (d) => {
                if (currentField === 'density') {
                    // Custom density coloring based on height
                    const height = d.height || 0;
                    if (height < 0.2) {
                        const t = height / 0.2;
                        return [
                            Math.floor(158 + (153 - 158) * t),
                            Math.floor(1 + (213 - 1) * t),
                            Math.floor(66 + (148 - 66) * t),
                        ];
                    } else if (height < 0.4) {
                        const t = (height - 0.2) / 0.2;
                        return [
                            Math.floor(153 + (230 - 153) * t),
                            Math.floor(213 + (245 - 213) * t),
                            Math.floor(148 + (152 - 148) * t),
                        ];
                    } else if (height < 0.6) {
                        const t = (height - 0.4) / 0.2;
                        return [
                            Math.floor(230 + (254 - 230) * t),
                            Math.floor(245 + (224 - 245) * t),
                            Math.floor(152 + (139 - 152) * t),
                        ];
                    } else if (height < 0.8) {
                        const t = (height - 0.6) / 0.2;
                        return [
                            Math.floor(254 + (253 - 254) * t),
                            Math.floor(224 + (174 - 224) * t),
                            Math.floor(139 + (97 - 139) * t),
                        ];
                    } else {
                        const t = (height - 0.8) / 0.2;
                        return [
                            Math.floor(253 + (213 - 253) * t),
                            Math.floor(174 + (62 - 174) * t),
                            Math.floor(97 + (79 - 97) * t),
                        ];
                    }
                } else {
                    // Regular color scheme based on field values
                    const scheme = colorSchemes[currentField];
                    const value = d[currentField];
                    const baseColor = scheme[value] || scheme.default;
                    return baseColor;
                }
            },
            pointSize: 0.4,
            pickable: true,
            opacity: .8,
            updateTriggers: {
                getColor: [currentField], // Force update when currentField changes
            },
        });
    }

    // Function to update the layer when currentField changes
    function updateLayer() {
        if (deckOverlay && pointData.length > 0) {
            const newLayer = createPointCloudLayer();
            deckOverlay.setProps({
                layers: [newLayer],
            });
        }
    }

    // Reactive statement to update layer when currentField changes
    $: if (currentField && deckOverlay) {
        updateLayer();
    }

    onMount(async () => {
        const map = new maplibregl.Map({
            container: "map",
            style: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
            center: [-79.4859889, 43.6848220],
            zoom: 10.887,
            pitch: 54,
            maxPitch: 65,
            bearing: 32,
        });

        map.on("load", async () => {
            // Console log initial map position
            console.log('Initial map position:', {
                center: map.getCenter(),
                zoom: map.getZoom(),
                pitch: map.getPitch(),
                bearing: map.getBearing()
            });

            // Add navigation controls (zoom in/out, compass)
            map.addControl(new maplibregl.NavigationControl(), "top-right");

            // Add scale control
            map.addControl(
                new maplibregl.ScaleControl({
                    maxWidth: 100,
                    unit: "metric",
                }),
                "bottom-left",
            );

            // Add fullscreen control
            map.addControl(new maplibregl.FullscreenControl(), "top-right");

            const response = await fetch(CSV_URL);
            const csvText = await response.text();
            const { data: csvData } = Papa.parse(csvText, {
                header: true,
                skipEmptyLines: true,
            });

            pointData = csvData.map((row) => ({
                coordinates: [
                    parseFloat(row.longitude || row.lon || row.lng),
                    parseFloat(row.latitude || row.lat),
                ],
                height: parseFloat(row.height || 0),
                gender: row.gender || "unknown",
            }));

            const pointCloudLayer = createPointCloudLayer();

            deckOverlay = new MapboxOverlay({
                layers: [pointCloudLayer],
            });

            map.addControl(deckOverlay);

            // Log map position changes
            map.on('moveend', () => {
                console.log('Map position changed:', {
                    center: map.getCenter(),
                    zoom: map.getZoom(),
                    pitch: map.getPitch(),
                    bearing: map.getBearing()
                });
            });
        });
    });
</script>

<div id="dashboard">
    <svg width="300" height="150" viewBox="0 0 280 150">
        <defs>
            <path id="curve" d="M 20,120 Q 140,20 260,120" />
        </defs>
        <text
            font-family="Arial, sans-serif"
            font-size="20"
            font-weight="bold"
            fill="black"
        >
            <textPath href="#curve">Population Pointillism</textPath>
        </text>
    </svg>
    <p>Explore the population density of Toronto through pointillism.</p>
    <p>1 point = 5 people</p>

    <!-- Field selector toggle -->
    <div class="field-selector">
        <label for="field-select">Color by:</label>
        <select id="field-select" bind:value={currentField}>
            <option value="density">Population Density</option>
            <option value="gender">Gender</option>
            <option value="age">People</option>
        </select>
    </div>
    
    <!-- Basemap toggle button -->
    <div class="basemap-toggle">
        <button on:click={() => showBasemap = !showBasemap}>
            {showBasemap ? 'Hide' : 'Show'} Basemap
        </button>
    </div>
</div>
<div id="map" class:hide-basemap={!showBasemap}></div>

<style>
    .field-selector {
        margin: 10px 0;
    }

    .field-selector label {
        margin-right: 10px;
        font-weight: bold;
        color: #333;
    }

    .field-selector select {
        padding: 5px 10px;
        border-radius: 4px;
        border: 1px solid #ccc;
        background: white;
        font-size: 14px;
        cursor: pointer;
    }

    .field-selector select:hover {
        border-color: #999;
    }

    .basemap-toggle {
        margin: 10px 0;
    }

    .basemap-toggle button {
        padding: 8px 16px;
        border-radius: 4px;
        border: 1px solid #ccc;
        background: white;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .basemap-toggle button:hover {
        background: #f0f0f0;
        border-color: #999;
    }
</style>
