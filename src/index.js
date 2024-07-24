import mapboxgl from "mapbox-gl";
import state from "../img/state.png";
import country from "../img/country.png";
import runningBolt from "../img/activities/running-bolt.png";
import runningTime from "../img/activities/running-time.png";
import runActivity from "../img/activities/running-activity.png";
import running from "../img/activities/running.png";
import cyclingBolt from "../img/activities/cycling-bolt.png";
import cyclingTime from "../img/activities/cycling-time.png";
import cyclingActivity from "../img/activities/cycling-activity.png";
import cycling from "../img/activities/cycling.png";

// dom
const workoutForm = document.querySelector("form");
const maptyHeader = document.querySelector(".header");
const inputDistance = document.getElementById("workout--distance");
const inputDuration = document.getElementById("workout--duration");
const inputCadence = document.getElementById("workout--cadence");
const inputGain = document.getElementById("workout--gain");
const inputType = document.getElementById("workout--type");
const errorBox = document.querySelector(".error");
const errorMessage = document.querySelector(".error__message");
const map = document.querySelector("#map");
const activityContainer = document.querySelector(".user__activities");
const deleteAll = document.querySelector(".btn--delete-all");
const home = document.querySelector(".btn--go-home");

const fullMonths = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

class App {
  #map;
  #currentWorkout;
  #allWorkouts = [];
  #home;
  #click;
  #spinner;
  #location;
  #error = false;
  constructor() {
    this.getUserCoordinates();
    this.changeWorkoutType();
    this.findWorkout();
    this.deleteAllWorkouts();
    this.onGo();
    this.onHome();
  }

  getUserCoordinates() {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        this.#home = [longitude, latitude]; // Longitude first, then latitude
        this.createMap(this.#home);
      },
      (err) => this.handleCoordinatesError("User denied geolocation!")
    );
  }

  createSpinner() {
    return `<div data-show="false" class="spinner"></div>`;
  }

  createMap(coordinates) {
    mapboxgl.accessToken =
      "pk.eyJ1Ijoia2VhbmRyZWxvdmVzY29kaW5nIiwiYSI6ImNseXVuNzZpejE2bHkycXE3eXIwd251MDEifQ.am0e8s43Le7W302oz_LivQ";
    this.#map = new mapboxgl.Map({
      container: "map", // container ID
      style: "mapbox://styles/mapbox/streets-v12", // style URL
      center: coordinates, // starting position [lng, lat]
      zoom: 13.5, // starting zoom
      bearing: -16,
      antialias: true,
    });
    this.#map.on("style.load", () => {
      this.#map.setFog({
        color: "#7dcf9b", // Pink fog / lower atmosphere
        "high-color": "#444b54", // Blue sky / upper atmosphere
        "horizon-blend": 0.4, // Exaggerate atmosphere (default is .1)
      });
      this.getLocalStorage();

      setTimeout(function () {
        home.classList.remove("hidden");
      }, 3250);

      const layers = this.#map.getStyle().layers;

      const labelLayer = layers.find(
        (layer) => layer.type === "symbol" && layer.layout["text-field"]
      );

      if (labelLayer) {
        const labelLayerId = labelLayer.id;
        this.#map.addLayer(
          {
            id: "add-3d-buildings",
            source: "composite",
            "source-layer": "building",
            filter: ["==", "extrude", "true"],
            type: "fill-extrusion",
            minzoom: 15,
            paint: {
              "fill-extrusion-color": "#aaa",
              "fill-extrusion-height": [
                "interpolate",
                ["linear"],
                ["zoom"],
                15,
                0,
                15.05,
                ["get", "height"],
              ],
              "fill-extrusion-base": [
                "interpolate",
                ["linear"],
                ["zoom"],
                15,
                0,
                15.05,
                ["get", "min_height"],
              ],
              "fill-extrusion-opacity": 0.6,
            },
          },
          labelLayerId
        );
      } else {
        this.handleError("Layer not found");
        // Optional: You might want to add the layer without a labelLayerId or handle the absence of the layer differently
      }
    });
    maptyHeader.classList.remove("hidden");
    this.addUserMarker(this.#home);
    this.listenMapClick();
  }

  addUserMarker(homeCoordinates) {
    const customMarker = document.createElement("div");
    customMarker.className = "homeMarker";
    const marker = new mapboxgl.Marker(customMarker)
      .setLngLat(homeCoordinates)
      .addTo(this.#map);
    this.#home = Object.values(marker._lngLat);
  }

  listenMapClick() {
    this.#map.on("click", async (e) => {
      // Check if there is an error before proceeding
      if (this.#error) {
        this.handleError("This location could not be found");
        return;
      }

      try {
        this.#click = Object.values(e.lngLat);
        this.#spinner = this.createSpinner();

        // Only proceed if workoutForm is hidden, spinner is not already showing, and there's no error
        if (
          workoutForm.classList.contains("hidden") &&
          !document.querySelector(".spinner[data-show='true']")
        ) {
          maptyHeader.insertAdjacentHTML("afterend", this.#spinner);
          document.querySelector(".spinner").dataset.show = true;
          setTimeout(function () {
            workoutForm.classList.remove("hidden");
            document.querySelector(".spinner").dataset.show = false;
            document.querySelector(".spinner").remove();
          }, 1000);
        }

        let gain = 0;

        if (inputType.value === "cycling") {
          // Await the elevation gain
          gain = await this.getElevation();
        }

        if (inputType.value === "running") {
          this.#currentWorkout = this.calculateMetrics(
            this.#home,
            this.#click,
            inputType.value
          );
        }

        if (inputType.value === "cycling") {
          this.#currentWorkout = this.calculateMetrics(
            this.#home,
            this.#click,
            inputType.value,
            6,
            0,
            15,
            gain
          );
        }
        this.setDescription();
        this.setWorkoutData(this.#currentWorkout, inputType.value);
        this.reverseGeocoding(this.#click[0], this.#click[1]);
      } catch (err) {
        this.handleError(err);
      }
    });
  }

  addClickedMarker() {
    const customMarker = document.createElement("div");
    customMarker.className = "clickedMarker";
    this.#currentWorkout.type === "running"
      ? customMarker.classList.add("clickedMarker__running")
      : customMarker.classList.add("clickedMarker__cycling");
    const marker = new mapboxgl.Marker(customMarker)
      .setLngLat(this.#currentWorkout.pos)
      .addTo(this.#map);
    this.#click = Object.values(marker._lngLat);
  }

  setDescription() {
    const date = new Date();
    const monthIndex = date.getMonth();
    const day = date.getDate();
    const year = date.getFullYear();

    this.#currentWorkout.description = `${
      this.#currentWorkout.type === "running" ? "Running" : "Cycling"
    } on ${fullMonths[monthIndex - 1]} ${day}, ${year}`;
  }

  async reverseGeocoding(lng, lat) {
    try {
      const fetchGeo = await fetch(
        `https://api.mapbox.com/search/geocode/v6/reverse?longitude=${lng}&latitude=${lat}&types=address&access_token=${mapboxgl.accessToken}`
      );
      if (!fetchGeo.ok) {
        this.#error = true;
        throw new Error("This location could not be found");
      }
      const recievedGeo = await fetchGeo.json();
      const geo = recievedGeo.features?.at(0)?.geometry;
      if (geo === undefined) {
        this.#error = true;
        throw new Error("This location could not be found");
      }
      const info = recievedGeo.features?.at(0)?.properties?.context;
      if (info === undefined) {
        this.#error = true;
        throw new Error("This location could not be found");
      }
      this.#location = {
        activity: this.#currentWorkout.type,
        coords: geo.coordinates,
        country: info.country.name,
        state: info.region.name,
        city: info.place.name,
        street: info.address.name,
      };
      this.#currentWorkout.home = this.#home;
      this.#currentWorkout.place = this.#location;

      await this.getAddressPhoto(
        this.#location.coords[0],
        this.#location.coords[1]
      );
      this.#error = false;
      this.displayLocation();
    } catch (err) {
      this.handleError(err);
    }
  }

  async getAddressPhoto(
    lng,
    lat,
    apiKey = "AIzaSyDWUJJr8PT9MAXL3AFfQU_cQWnf2ZO_OwU"
  ) {
    try {
      const corsProxy = "https://corsproxy.io/?";
      const size = "600x400";
      const address = await fetch(
        `${corsProxy}https://maps.googleapis.com/maps/api/streetview?size=${size}&location=${lat},${lng}&heading=151.78&pitch=-0.76&key=${apiKey}`
      );
      if (!address.ok) throw new Error(`Location data could not be found`);
      this.#location.url = address.url;
    } catch (err) {
      this.handleError(err);
    }
  }

  async displayLocation(type = this.#currentWorkout.type) {
    const locationHTML = ` <div class="location">
        <img
          class="location__img"
          src="${this.#location.url}"
          alt="Location image"
        />
        <div class="location__info">
          <div class="location__header">
            <h2 class="location__city">${this.#location.city}</h2>
            <h3 class="location__address">${this.#location.street}</h3>
          </div>
        </div>
        <div class="location__state">
          <img
            class="location__state--logo"
            src="${state}"
            alt="State image"
          />
          <h4 class="location__state--name">${this.#location.state}</h4>
        </div>
        <div class="location__country">
          <img
            class="location__country--logo"
            src="${country}"
            alt="Country image"
          />
          <h4 class="location__country--name">${this.#location.country}</h4>
        </div>
        <div class="confirm__location">
          <h4 class="confirm__location--text">
            Is this where you are ${type}?
          </h4>
          <div class="confirm__location--btns">
            <button class="btn yes">yes</button>
            <button class="btn no">no</button>
          </div>
        </div>
      </div>`;
    if (document.querySelector(".location")) {
      document.querySelector(".location").remove();
    }
    map.insertAdjacentHTML("afterend", locationHTML);
    this.confirmLocation();
  }

  confirmLocation() {
    document.querySelector(".location").addEventListener(
      "click",
      async function (e) {
        try {
          if (!this.#currentWorkout) throw new Error();
          if (!e.target.classList.contains("btn")) return;
          if (e.target.classList.contains("yes")) {
            const yesBtn = e.target;
            const location = yesBtn.closest(".location");
            await this.handleFormSubmit();
            await this.displayEverything();
            this.newWorkout();
            this.reset();

            setTimeout(function () {
              location.remove();
            }, 1200);
            location.style.animation = "pushReleaseToRight 1.2s ease-in-out";
          } else {
            const noBtn = e.target;
            const location = noBtn.closest(".location");
            setTimeout(function () {
              location.remove();
            }, 1200);
            location.style.animation = "pushReleaseToRight 1.2s ease-in-out";
            this.removeForm();
          }
        } catch (err) {
          this.handleError(err);
        }
      }.bind(this)
    );
  }

  createWorkout() {
    const workoutMarkup = `<div data-id="${
      this.#currentWorkout.id
    }" class="activity activity__${this.#currentWorkout.type}">
            <div class="activity__config">
              <h2 class="activity__config--date activity__config--${
                this.#currentWorkout.description.includes("Running")
                  ? "running"
                  : "cycling"
              }">${this.#currentWorkout.description}</h2>
              <div class="activity__config--btns">
                <button class="btn delete btn--small activity__btns__${
                  this.#currentWorkout.type
                }">
                  delete
                </button>
                 <button class="btn go btn--small activity__btns__${
                   this.#currentWorkout.type
                 }">
                 go
                </button>
              </div>
            </div>
            <ul class="activity__nav">
              <li class="activity__items">
                <img src="${
                  this.#currentWorkout.type === "running"
                    ? runActivity
                    : cyclingActivity
                }" alt="" />
                <span class="number">${this.#currentWorkout.distance}</span> MI
              </li>
              <li class="activity__items">
                <img src="${
                  this.#currentWorkout.type === "running"
                    ? runningTime
                    : cyclingTime
                }" alt="" />
                <span class="number">${
                  this.#currentWorkout.duration
                }</span> MINS
              </li>
              <li class="activity__items">
                <img src="${
                  this.#currentWorkout.type === "running"
                    ? runningBolt
                    : cyclingBolt
                }" alt="" />
                <span class="number">2.0</span>
              </li>
              <li class="activity__items">
                <img src="${
                  this.#currentWorkout.type === "running" ? running : cycling
                }" alt="" />
                <span class="number">${
                  this.#currentWorkout.type === "running"
                    ? this.#currentWorkout.cadence
                    : this.#currentWorkout.gain
                }</span> ${
      this.#currentWorkout.type === "running" ? "SPM" : "M"
    }
              </li>
            </ul>
          </div>`;
    activityContainer.insertAdjacentHTML("afterbegin", workoutMarkup);
  }

  removeForm() {
    workoutForm.classList.toggle("hidden");
    inputDistance.value = inputDuration.value = "";
    this.#location.type === "running"
      ? (inputCadence.value = "")
      : (inputGain.value = "");
  }

  setWorkoutData(workout, type = "running") {
    if (type === "running") {
      inputDistance.value = workout.distance;
      inputDuration.value = workout.duration;
      inputCadence.value = workout.cadence;
    } else {
      inputDistance.value = workout.distance;
      inputDuration.value = workout.duration;
      inputGain.value = workout.gain;
    }
  }

  changeWorkoutType() {
    inputType.addEventListener("change", async (e) => {
      e.preventDefault();

      const type = inputType.value;

      // Toggle visibility of inputs based on selected workout type
      inputCadence.closest(".workout--activity").classList.toggle("hidden");
      inputGain.closest(".workout--activity").classList.toggle("hidden");

      // If there's an existing workout, update the form fields based on the selected type
      if (this.#currentWorkout) {
        if (this.#currentWorkout.type === type) {
          // Type hasn't changed, just update the form with existing data
          this.setWorkoutData(this.#currentWorkout, type);
        } else {
          // Type has changed, clear the form fields
          inputDistance.value = "";
          inputDuration.value = "";
          inputCadence.value = "";
          inputGain.value = "";

          // If the new type is running, update the workout type
          if (type === "running") {
            this.#currentWorkout = {
              ...this.#currentWorkout,
              type,
            };
            this.setDescription();
            this.setWorkoutData(this.#currentWorkout, type);
            this.displayLocation(type);
          }

          // If the new type is cycling, fetch the elevation data and update the workout type
          if (type === "cycling") {
            try {
              if (this.#click) {
                const gain = await this.getElevation();
                this.#currentWorkout = {
                  ...this.#currentWorkout,
                  type,
                  gain,
                };
                this.setDescription();
                this.setWorkoutData(this.#currentWorkout, type);
                this.displayLocation(type);
              }
            } catch (err) {
              this.handleError(err);
            }
          }
        }
      }
    });
  }

  calculateMetrics(
    startCoordinates,
    endCoordinates,
    type,
    speed = 6,
    strideLength = 2.5,
    bikeSpeed = 15,
    gain = 0
  ) {
    // Function to convert degrees to radians
    const toRadians = (degrees) => (degrees * Math.PI) / 180;

    // Function to calculate distance between two coordinates using Haversine formula
    function calculateDistance(coord1, coord2) {
      const [lon1, lat1] = coord1;
      const [lon2, lat2] = coord2;

      const R = 3959; // Radius of the Earth in miles

      const φ1 = toRadians(lat1);
      const φ2 = toRadians(lat2);
      const Δφ = toRadians(lat2 - lat1);
      const Δλ = toRadians(lon2 - lon1);

      const a =
        Math.sin(Δφ / 2) ** 2 +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      return R * c;
    }

    // Function to calculate running duration based on distance and speed
    function calculateRunningDuration(distance, speed) {
      const timeInHours = distance / speed; // Time in hours
      return Math.round(timeInHours * 60); // Time in minutes
    }

    // Function to calculate running cadence (steps per minute)
    function calculateRunningCadence(distance, duration, strideLength) {
      const distanceInFeet = distance * 5280; // Convert miles to feet
      const steps = distanceInFeet / strideLength; // Total steps
      const cadence = steps / duration; // Steps per minute
      return Math.round(cadence);
    }

    // Function to calculate cycling duration based on distance and speed
    function calculateCyclingDuration(distance, bikeSpeed) {
      const timeInHours = distance / bikeSpeed; // Time in hours
      return Math.round(timeInHours * 60); // Time in minutes
    }

    // Function to calculate elevation gain from coordinates
    function calculateElevationGain(startCoords, endCoords) {
      // Placeholder for elevation gain calculation
      return gain; // You would need actual elevation data from a map service
    }

    // Calculate metrics based on the type
    const distance = calculateDistance(startCoordinates, endCoordinates);
    let duration, cadence, gainValue;

    if (type === "running") {
      duration = calculateRunningDuration(distance, speed);
      cadence = calculateRunningCadence(distance, duration, strideLength);
      return {
        distance: +distance.toFixed(2), // Distance in miles
        duration, // Duration in minutes
        cadence, // Cadence (steps per minute) for running
        type: inputType.value,
        id: +(Date.now() + "").slice(-8),
        pos: this.#click,
      };
    } else if (type === "cycling") {
      duration = calculateCyclingDuration(distance, bikeSpeed);
      gainValue = calculateElevationGain(startCoordinates, endCoordinates);
      return {
        distance: +distance.toFixed(2), // Distance in miles
        duration, // Duration in minutes
        gain, // Elevation gain for cycling
        type: inputType.value,
        id: +(Date.now() + "").slice(-8),
        pos: this.#click,
      };
    } else {
      throw new Error("Invalid type. Must be 'running' or 'cycling'.");
    }
  }

  async getElevation() {
    try {
      // Construct the API request.
      const query = await fetch(
        `https://api.mapbox.com/v4/mapbox.mapbox-terrain-v2/tilequery/${
          this.#currentWorkout.pos[0]
        },${
          this.#currentWorkout.pos[1]
        }.json?layers=contour&limit=50&access_token=${mapboxgl.accessToken}`,
        { method: "GET" }
      );
      if (query.status !== 200)
        throw new Error("Failed to fetch elevation data");
      const data = await query.json();
      // Get all the returned features.
      const allFeatures = data.features;
      // For each returned feature, add elevation data to the elevations array.
      const elevations = allFeatures.map((feature) => feature.properties.ele);
      // In the elevations array, find the largest value.
      const highestElevation = Math.max(...elevations);
      return highestElevation;
    } catch (err) {
      this.handleError(err);
    }
  }

  handleFormSubmit() {
    try {
      if (!this.#currentWorkout || !this.#currentWorkout.id)
        throw new Error("Location not set");
      const type = inputType.value;
      const distance = +inputDistance.value;
      const duration = +inputDuration.value;

      if (type === "running") {
        const cadence = +inputCadence.value;
        if (!isFinite(distance && duration && cadence))
          throw new Error("Please only use numbers!");
        inputDistance.value = inputDuration.value = inputCadence.value = "";
        inputCadence.blur();
      }

      if (type === "cycling") {
        const gain = +inputGain.value;
        if (!isFinite(distance && duration && gain))
          throw new Error("Please only use numbers!");
        inputDistance.value = inputDuration.value = inputGain.value = "";
        inputGain.blur();
      }
      workoutForm.classList.toggle("blurOutTop");
      setTimeout(function () {
        workoutForm.classList.toggle("blurOutTop");
        workoutForm.classList.toggle("hidden");
      }, 1000);
    } catch (err) {
      this.handleError(err);
    }
  }

  async createGeoLine() {
    try {
      if (
        !this.#currentWorkout.place ||
        !this.#currentWorkout.id ||
        !this.#currentWorkout
      )
        throw new Error("Location is not set");

      const response = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/${
          this.#currentWorkout.type === "running" ? "walking" : "cycling"
        }/${this.#currentWorkout.home.join(
          ","
        )};${this.#currentWorkout.pos.join(
          ","
        )}?steps=true&geometries=geojson&access_token=${mapboxgl.accessToken}`
      );
      if (!response.ok) throw new Error("Could not create GEO line");
      const data = await response.json();
      const route = data.routes[0].geometry.coordinates;
      const routeId = `route-${this.#currentWorkout.id}`;
      this.#currentWorkout.route = route;
      this.#currentWorkout.routeId = routeId;
      if (!this.#currentWorkout.routeId) throw new Error("Failed: RouteId");

      // Add the route as a GeoJSON source
      this.#map.addSource(this.#currentWorkout.routeId, {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: this.#currentWorkout.route,
          },
        },
      });

      // Add the route as a line layer
      this.#map.addLayer({
        id: this.#currentWorkout.routeId,
        type: "line",
        source: this.#currentWorkout.routeId,
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
        paint: {
          "line-color": `${
            this.#currentWorkout.type === "running" ? "#007acc" : "#ff8800"
          }`,
          "line-width": 8,
        },
      });
    } catch (err) {
      this.handleError(err);
    }
  }
  handleError(message) {
    // Clear form fields
    if (inputType.value === "running") {
      inputDistance.value = inputDuration.value = inputCadence.value = "";
    }
    if (inputType.value === "cycling") {
      inputDistance.value = inputDuration.value = inputGain.value = "";
    }

    // Display error message
    errorBox.classList.remove("hidden");
    errorMessage.textContent = message;

    // Hide form
    workoutForm.classList.add("hidden");

    // Hide error message after a delay
    setTimeout(function () {
      errorBox.classList.add("hidden");
    }, 2500);

    // Reset error state
    this.#error = false;

    // Remove location display if present
    if (document.querySelector(".location")) {
      document.querySelector(".location").remove();
    }
  }

  handleCoordinatesError(message) {
    errorMessage.textContent = message;
    errorBox.classList.toggle("hidden");
    setTimeout(function () {
      errorBox.classList.toggle("hidden");
    }, 3500);
  }

  reset() {
    // Handle the form submission based on the current workout type
    if (inputType.value === "cycling") {
      inputType.value = "running";

      // Switch the type to running and update the form fields
      inputGain.closest(".workout--activity").classList.toggle("hidden");
      inputCadence.closest(".workout--activity").classList.toggle("hidden");
    }

    // Clear the form fields
    inputDistance.value = "";
    inputDuration.value = "";

    // Reset cadence and gain fields based on type
    if (inputType.value === "running") {
      inputCadence.value = "";
    } else {
      inputGain.value = "";
    }
  }

  setLocalStorage(workoutsList) {
    localStorage.setItem("workouts", JSON.stringify(workoutsList));
  }

  async getLocalStorage() {
    const data = localStorage.getItem("workouts");

    // Check if data is not null or an empty string
    if (data && data.length > 0) {
      this.#allWorkouts = JSON.parse(data);

      // Create and display the storage markup
      this.createStorageMarkup();

      // Delay removal of the storage markup and processing of workouts
      setTimeout(async () => {
        document.querySelector(".storage").remove();

        for (const workout of this.#allWorkouts) {
          this.#currentWorkout = workout;
          try {
            await this.displayEverything();
          } catch (err) {
            this.handleError(err);
          }
          this.#currentWorkout = {};
          this.showDeleteAll();
        }
      }, 3000);
    }
  }

  async displayEverything() {
    this.createWorkout();
    this.addClickedMarker();
    await this.createGeoLine();
  }

  newWorkout() {
    this.#allWorkouts.push(this.#currentWorkout);
    this.showDeleteAll();
    this.setLocalStorage(this.#allWorkouts);
    this.#currentWorkout = {};
  }

  createStorageMarkup() {
    const storage = ` <div class="storage">
          <div class="storage__spinner"></div>
          <div class="storage__progress"></div>
          <div class="storage__info">
            <div class="storage__header">
              <img src="img/happy.gif" alt="" />
              <h3>Looking for your workouts</h3>
            </div>
            <p class="storage__wait">please be patient</p>
          </div>
        </div>`;

    maptyHeader.insertAdjacentHTML("afterend", storage);
  }

  findWorkout() {
    activityContainer.addEventListener(
      "click",
      function (e) {
        if (!e.target.classList.contains("delete")) return;
        const foundElement = e.target.closest(".activity");
        const foundElementId = +foundElement.dataset.id;
        const foundWorkoutIndex = this.#allWorkouts.findIndex(
          (workout) => workout.id === foundElementId
        );
        this.#allWorkouts.splice(foundWorkoutIndex, 1);
        foundElement.remove();
        this.setLocalStorage(this.#allWorkouts);
        window.location.reload();
      }.bind(this)
    );
  }

  showDeleteAll() {
    if (this.#allWorkouts.length >= 2) deleteAll.classList.remove("hidden");
    if (this.#allWorkouts.length <= 1) deleteAll.classList.add("hidden");
  }

  deleteAllWorkouts() {
    deleteAll.addEventListener(
      "click",
      function () {
        this.#allWorkouts = [];
        this.setLocalStorage(this.#allWorkouts);
        activityContainer.innerHTML = "";
        window.location.reload();
      }.bind(this)
    );
  }

  onGo() {
    activityContainer.addEventListener(
      "click",
      function (e) {
        if (!e.target.classList.contains("go")) return;
        const foundElementId = e.target.closest(".activity").dataset.id;
        this.#currentWorkout = this.#allWorkouts.find(
          (workout) => workout.id === +foundElementId
        );
        this.flyToWorkout();
      }.bind(this)
    );
  }

  flyToWorkout() {
    this.#map.flyTo({
      center: this.#currentWorkout.pos,
      duration: 6000,
      zoom: 17.5,
      speed: 1.2,
      curve: 1.5,
      essential: true,
    });
  }

  onHome() {
    home.addEventListener(
      "click",
      function (e) {
        this.flyToHome();
      }.bind(this)
    );
  }

  flyToHome() {
    this.#map.flyTo({
      center: this.#home,
      duration: 6000,
      zoom: 17.5,
      speed: 1.2,
      curve: 1.5,
      essential: true,
    });
  }
}

const start = new App();
