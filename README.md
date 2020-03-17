# sarscov2.js
Intuitive charts for an easy overlook of the SARS-CoV-2 pandemic.

# Technologies
- node v13.5.0
- npm 6.13.4

# Installation
`npm i`

# Running
`npm start` (will start in your local browser)

# Data source
The data is fetched from the periodically updated CSV files located at https://github.com/CSSEGISandData/COVID-19/tree/master/csse_covid_19_data/csse_covid_19_time_series.

# Configuration
The configuration file is located at `src/config.json`. You may edit the `countriesOfInterest` variable to display charts for the countries of your interest. The country names are listed in the data source above.
