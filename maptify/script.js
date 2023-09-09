"use strict";

// prettier-ignore
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

class Workout {
  date = new Date();
  id = (Date.now() + "").slice(-10);

  constructor(coords, distance, duration) {
    this.coords = coords; // [lat, lng]
    this.distance = distance; // in km
    this.duration = duration; // in min
  }

  _setDescription() {
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(
      1
    )} on ${this.date.getDate()} ${months[this.date.getMonth()]}`;
  }
}

class Running extends Workout {
  type = "running";

  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence; // in spm
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = "cycling";
  constructor(coords, distance, duration, elevation) {
    super(coords, distance, duration);
    this.elevation = elevation; // in m
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    // km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

const form = document.querySelector(".form");
const containerWorkouts = document.querySelector(".workouts");
const inputType = document.querySelector(".form__input--type");
const inputDistance = document.querySelector(".form__input--distance");
const inputDuration = document.querySelector(".form__input--duration");
const inputCadence = document.querySelector(".form__input--cadence");
const inputElevation = document.querySelector(".form__input--elevation");

let map,
  mapEvent,
  workouts = [];

/*

** App Architecture

 * 1. Get user's current position
 * 2. Load map using Leaflet
 * 3. Show form on map click
 * 4. Hide form on map click
 * 5. Toggle elevation field
 * 6. Create a new workout
 */

class App {
  #map;
  #mapEvent;
  #workouts = [];
  #zoomLevel = 13;

  constructor() {
    this._getPosition();
    form.addEventListener("submit", this._newWorkout.bind(this));
    inputType.addEventListener("change", this._toggleElevationField);
    containerWorkouts.addEventListener("click", this._moveToPopup.bind(this));
    this._getLocalStorage();
  }

  /*
   ** 1. Get user's current position
   */

  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert("Could not get your position");
        }
      );
    }
  }

  /*
   ** 2. Load map using Leaflet
   */

  _loadMap(position) {
    const { latitude, longitude } = position.coords;

    const coords = [latitude, longitude];
    this.#map = L.map("map").setView(coords, this.#zoomLevel);

    L.tileLayer("https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png", {
      attribution: "",
    }).addTo(this.#map);

    this.#map.on("click", this._showForm.bind(this));
    this.#workouts.forEach((work) => {
      this._renderWorkoutMarker(work);
    });
  }

  /*
   ** 3. Show form on map click
   */

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove("hidden");
    inputDistance.focus();
  }
  _hideForm() {
    // Empty inputs
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        "";

    // Hide form
    form.style.display = "none";
    form.classList.add("hidden");
    setTimeout(() => (form.style.display = "grid"), 1000);
  }

  /*
   ** 4. Hide form on map click
   */

  _toggleElevationField() {
    inputElevation.closest(".form__row").classList.toggle("form__row--hidden");
    inputCadence.closest(".form__row").classList.toggle("form__row--hidden");
  }

  /*
   ** 6. Create a new workout
   */
  _newWorkout(e) {
    e.preventDefault();

    const validInputs = (...inputs) =>
      inputs.every((inp) => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every((inp) => inp > 0);

    const { lat, lng } = this.#mapEvent.latlng;

    // Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const cadence = +inputCadence.value;
    const elevation = +inputElevation.value;
    let workout;

    // If workout running, create running object
    if (type === "running") {
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      ) {
        return alert("Inputs have to be positive numbers");
      }

      workout = new Running([lat, lng], distance, duration, cadence);
      this.#workouts.push(workout);
    }

    // If workout cycling, create cycling object
    if (type === "cycling") {
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      ) {
        return alert("Inputs have to be positive numbers");
      }

      workout = new Cycling([lat, lng], distance, duration, elevation);
      this.#workouts.push(workout);
    }

    // Render workout on map as marker
    this._renderWorkoutMarker(workout);
    this._renderWorkout(workout);
    this._hideForm();
    this._setLocalStorage();
  }

  _renderWorkoutMarker(wordout) {
    L.marker(wordout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${wordout.type}-popup`,
        })
      )
      .setPopupContent(
        ` ${wordout.type === "running" ? "🏃‍♂️" : "🚴‍♀️"} ${wordout.description}`
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = ` 
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
        <h2 class="workout__title">${workout.description}</h2>
        <div class="workout__details">

            <span class="workout__icon">${
              workout.type === "running" ? "🏃‍♂️" : "🚴‍♀️"
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>

        </div>
        <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
        </div>
 
    `;
    if (workout.type === "running") {
      html += `
        <div class="workout__details">
            
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>

        </div>
        <div class="workout__details">

            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>

        </div>
        </li>
        `;
    }

    if (workout.type === "cycling") {
      html += `
        <div class="workout__details">
        
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
             
        </div>
        <div class="workout__details">
        
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
             
        </div>
        </li>
        `;
    }
    form.insertAdjacentHTML("afterend", html);
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest(".workout");
    if (!workoutEl) return;

    const workout = this.#workouts.find(
      (work) => work.id === workoutEl.dataset.id
    );

    this.#map.setView(workout.coords, this.#zoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }
  _setLocalStorage() {
    localStorage.setItem("workouts", JSON.stringify(this.#workouts));
  }
  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem("workouts"));

    if (!data) return;
    this.#workouts = data;

    this.#workouts.forEach((work) => {
      this._renderWorkout(work);
    });
  }
  _reset() {
    localStorage.removeItem("workouts");
    location.reload();
  }
}

const app = new App();
