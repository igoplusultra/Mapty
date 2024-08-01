<img src="https://github.com/user-attachments/assets/a6ddec08-9bf3-4431-9db2-90929f94af78" width="200%">


# Fitness Tracking App

<br>

## Overview

The Fitness Tracking App is a web application designed to help users track their running and cycling workouts on a map. It leverages Mapbox for interactive map features and Google Maps Street View for location images. Users can log their workouts, view their activities on the map, and visualize their routes with detailed metrics.

<br>

## Features

- **Interactive Map**: View your location and track workouts on an interactive map using Mapbox.
- **Workout Logging**: Log running and cycling workouts with metrics such as distance, duration, cadence (for running), and elevation gain (for cycling).
- **Location Visualization**: Reverse geocode the workout location to display detailed location information and street view images.
- **Error Handling**: Handles geolocation and API errors gracefully.
- **Local Storage**: Save and retrieve workout data using local storage.
- **Route Visualization**: Display routes on the map based on workout data.

<br>

## Demo

Check out a demonstration of the app in action:
<p align="center">
   <img align="center" src="https://github.com/user-attachments/assets/622535b7-bfa4-42cd-9174-989512ac3208" width="680" alt="mapty">
   <img src="https://github.com/user-attachments/assets/dc4f9431-5140-4e7b-822c-c58c4d79b58b">
</p>

<br>


## Live Site

Explore the live application here: [Fitness Tracking App](https://mapty-v3.netlify.app/)

## Getting Started

### Prerequisites

- Node.js and npm installed on your machine.
- A Mapbox account for map functionality. Obtain an access token from [Mapbox](https://www.mapbox.com/).
- A Google Maps API key for street view images. Obtain an API key from [Google Cloud](https://cloud.google.com/maps-platform).

### Installation

   ```bash
   git clone https://github.com/igoplusultra/Mapty.git
   cd Mapty
   sudo npm install
   
