<script>
    import { onMount } from "svelte";
    import { base } from "$app/paths";
    import maplibregl from "maplibre-gl";
    import "maplibre-gl/dist/maplibre-gl.css";
    import { MapboxOverlay } from "@deck.gl/mapbox";
    import { PointCloudLayer } from "@deck.gl/layers";
    import Papa from "papaparse";

    const CSV_URL = `${base}/pop-points.csv`;
    let pointData = [];
    let isDataLoaded = false;
    let isLoading = true;
    let error = null;

    onMount(async () => {
        // Load CSV data first
        try {
            console.log("Loading CSV from:", CSV_URL);
            
            // Add cache busting for GitHub Pages
            const csvUrl = `${CSV_URL}?v=${Date.now()}`;
            
            // Add timeout to prevent hanging
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
            
            const response = await fetch(csvUrl, {
                cache: 'no-cache',
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`Failed to fetch CSV: ${response.status} ${response.statusText}`);
            }
            
            const csvText = await response.text();
            console.log("CSV loaded successfully, size:", csvText.length, "characters");
            
            const { data: csvData } = Papa.parse(csvText, {
                header: true,
                skipEmptyLines: true,
            });

            console.log("Parsed CSV data points:", csvData.length);

            pointData = csvData.map((row) => ({
                coordinates: [
                    parseFloat(row.longitude || row.lon || row.lng),
                    parseFloat(row.latitude || row.lat),
                ],
                height: parseFloat(row.height || 0),
            }));

            console.log("Processed point data:", pointData.length, "points");
            isDataLoaded = true;
            isLoading = false;

        } catch (error) {
            console.error("Error loading CSV data:", error);
            isLoading = false;
            error = error.message;
            return; // Don't initialize map if data loading fails
        }

        // Initialize map after data is loaded
        const map = new maplibregl.Map({
            container: "map",
            style: {
                version: 8,
                sources: {},
                layers: [],
            },
            center: [-79.3832, 43.6532],
            zoom: 11,
            pitch: 70,
            maxPitch: 85,
            bearing: 40,
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

            // Add fullscreen control
            map.addControl(new maplibregl.FullscreenControl(), "top-right");

            // Use the pre-loaded point data
            if (!isDataLoaded || pointData.length === 0) {
                console.error("No data available for visualization");
                return;
            }

            console.log("Creating point cloud layer with", pointData.length, "points");

            const pointCloudLayer = new PointCloudLayer({
                id: "point-cloud-layer",
                data: pointData,
                getPosition: (d) => [
                    d.coordinates[0],
                    d.coordinates[1],
                    (d.height || 0) ** 2 * 2000 - 100,
                ],
                getColor: (d) => {
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
                },
                pointSize: 0.7,
                pickable: true,
            });

            const deckOverlay = new MapboxOverlay({
                layers: [pointCloudLayer],
            });

            map.addControl(deckOverlay);
        });
    });
</script>

{#if isLoading}
    <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; font-size: 18px; z-index: 1000;">
        Loading population data...
    </div>
{/if}

{#if error}
    <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); color: red; font-size: 18px; z-index: 1000; text-align: center;">
        Error loading data: {error}<br>
        <small>Check console for details</small>
    </div>
{/if}

<div id="map" style="width: 100%; height: 100vh; background: black;"></div>
