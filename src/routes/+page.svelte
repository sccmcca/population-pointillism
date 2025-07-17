<script>
    // Modules and components
    import { onMount } from "svelte";
    import { base } from "$app/paths";
    import maplibregl from "maplibre-gl";
    import "maplibre-gl/dist/maplibre-gl.css";
    import Logo from "../assets/logo.svg";
    import Papa from "papaparse";
    import { MapboxOverlay } from "@deck.gl/mapbox";
    import { PointCloudLayer } from "@deck.gl/layers";
    import HeightToggle from "$lib/HeightToggle.svelte";
    import PointSizeSlider from "$lib/PointSizeSlider.svelte";
    import { colorSchemes } from "$lib/colorSchemes.js";
    import "../assets/styles.css";

    // Initialize variables
    let map; // Map instance
    let currentField = "people"; // Default field to color by
    let deckOverlay; // Deck.gl overlay for point cloud layer
    let pointData = []; // Array to hold point data from CSV
    let showBasemap = true; // Show basemap by default
    let showCanvas = true; // Show canvas by default
    let heightMultiplier = 1; // Start with extended height
    let pointSize = 0.4; // Point size for the slider
    let zoomFactor = 1; // Zoom-based scaling factor

    // URL to the CSV data
    const CSV_URL = `${base}/pop-points-with-gender.csv`;

    // Function to create the point cloud layer
    function createPointCloudLayer() {
        return new PointCloudLayer({
            id: `point-cloud-layer-${currentField}`, // Change ID to force re-render
            data: pointData,
            getPosition: (d) => [
                d.coordinates[0],
                d.coordinates[1],
                ((d.height || 0) ** 2 * 4000 - 100) * heightMultiplier,
            ],
            getColor: (d) => {
                const scheme = colorSchemes[currentField];

                // Continuous color schemes
                if (scheme?.ranges) {
                    const height = d.height || 0;
                    for (let i = 0; i < scheme.ranges.length; i++) {
                        const range = scheme.ranges[i];
                        const min = i === 0 ? 0 : scheme.ranges[i - 1].max;
                        if (height < range.max) {
                            const t = (height - min) / (range.max - min);
                            return range.startColor.map((c, j) =>
                                Math.floor(c + (range.endColor[j] - c) * t),
                            );
                        }
                    }
                    return scheme.ranges[scheme.ranges.length - 1].endColor;
                }

                // Discrete color schemes
                const value = d[currentField];
                return scheme[value] || scheme.default;
            },

            pointSize: pointSize * zoomFactor, // Apply both slider and zoom scaling
            opacity: 0.8, // Set opacity for the points
            updateTriggers: {
                getColor: [currentField], // Force update when currentField changes
                getPosition: [heightMultiplier], // Force update when height changes
                pointSize: [pointSize, zoomFactor], // Force update when point size or zoom changes
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

    // Reactive statement to update layer when heightMultiplier changes
    $: if (heightMultiplier !== undefined && deckOverlay) {
        updateLayer();
    }

    // Reactive statement to update layer when pointSize changes
    $: if (pointSize !== undefined && deckOverlay) {
        updateLayer();
    }

    // Reactive statement to update layer when zoomFactor changes
    $: if (zoomFactor !== undefined && deckOverlay) {
        updateLayer();
    }

    // Zoom factor
    function calculateZoomFactor(zoom) {
        const baseZoom = 10.887;
        const zoomSensitivity = 0.3;
        return Math.pow(2, (zoom - baseZoom) * zoomSensitivity);
    }

    // Function to handle pitch toggle
    function handlePitchToggle(isExtended) {
        if (map) {
            const targetPitch = isExtended ? 54 : 0;
            map.easeTo({
                pitch: targetPitch,
                duration: 800,
            });
        }
    }

    // On mount, initialize the map and load data
    onMount(async () => {
        map = new maplibregl.Map({
            container: "map",
            style: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
            center: [-79.4859889, 43.684822],
            zoom: 10.887,
            pitch: 54,
            maxPitch: 65,
            bearing: 32,
        });

        map.on("load", async () => {
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

            // Add fullscreen ntrol
            map.addControl(new maplibregl.FullscreenControl(), "top-right");

            // Load the CSV data
            const response = await fetch(CSV_URL);
            const csvText = await response.text();
            const { data: csvData } = Papa.parse(csvText, {
                header: true,
                skipEmptyLines: true,
            });

            // Process CSV data into pointData array
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

            // Initialize zoom factor
            zoomFactor = calculateZoomFactor(map.getZoom());

            // Listen for zoom changes to update point size
            map.on("zoom", () => {
                const newZoomFactor = calculateZoomFactor(map.getZoom());
                if (Math.abs(newZoomFactor - zoomFactor) > 0.01) {
                    zoomFactor = newZoomFactor;
                }
            });

            // Log map position changes
            map.on("moveend", () => {
                console.log("Map position changed:", {
                    center: map.getCenter(),
                    zoom: map.getZoom(),
                    pitch: map.getPitch(),
                    bearing: map.getBearing(),
                });
            });
        });
    });
</script>

<div id="dashboard">
    <div
        class="border"
        style="max-height: 80px; width: 100%; min-width: 300px;"
    >
        <img
            src={Logo}
            alt="Population Pointillism Logo"
            class="logo"
            style="max-width: 300px; margin: 10px"
        />
    </div>

    <div class="border" style="height: 100px; overflow: auto;">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
            eiusmod tempor incididunt ut labore et dolore magna aliqua. 
    <br><br>
            1 point = 5 people
    </div>

    <!-- Field selector toggle -->
    <div class="field-selector">
        <label>Thematic</label>
        <div class="field-buttons">
            <button
                class:active={currentField === "people"}
                on:click={() => (currentField = "people")}
            >
                People
            </button>
            <button
                class:active={currentField === "density"}
                on:click={() => (currentField = "density")}
            >
                Population Density
            </button>
            <button
                class:active={currentField === "gender"}
                on:click={() => (currentField = "gender")}
            >
                Gender
            </button>
            <button
                class:active={currentField === ""}
                on:click={() => (currentField = "")}
                style="display: none;"
            >
                Age
            </button>
            <button
                class:active={currentField === ""}
                on:click={() => (currentField = "")}
                style="display: none;"
            >
                Ethnic Origin
            </button>
            <button
                class:active={currentField === ""}
                on:click={() => (currentField = "")}
                style="display: none;"
            >
                Income
            </button>

            <button
                class:active={currentField === ""}
                on:click={() => (currentField = "")}
                style="display: none;"
            >
                Transportation
            </button>
        </div>
    </div>

    <div class="height-control">
    <label>3D</label>
    <div class="field-buttons" style="flex-direction: column;">
                <button
            class:active={heightMultiplier === 1}
            on:click={() => {
                heightMultiplier = 1;
                handlePitchToggle(true);
            }}
        >
            Population Density
        </button>
        <button
            class:active={heightMultiplier === 0}
            on:click={() => {
                heightMultiplier = 0;
                handlePitchToggle(false);
            }}
        >
            Flat
        </button>
    </div>
</div>

    <!-- Height toggle component -->
    <div class="height-control">
        <HeightToggle bind:heightMultiplier onPitchToggle={handlePitchToggle} />
    </div>

    <!-- Point size slider -->
    <div class="point-size-control">
        <PointSizeSlider bind:pointSize />
    </div>

    <div class="basemap-controls">
        <div class="basemap-buttons">
            <div class="top-buttons">
                Basemap:
                <button
                    class="basemap-btn invert-btn"
                    on:click={() => (showBasemap = !showBasemap)}
                >
                    Invert
                </button>
                <button
                    class="basemap-btn toggle-btn"
                    class:active={showCanvas}
                    on:click={() => (showCanvas = !showCanvas)}
                >
                    {showCanvas ? "Off" : "On"}
                </button>
            </div>
        </div>
    </div>
</div>
<div
    id="map"
    class:hide-basemap={!showBasemap}
    class:hide-canvas={!showCanvas}
></div>
