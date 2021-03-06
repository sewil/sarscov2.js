import React from 'react'
import csv from 'csvtojson'
import _ from 'lodash'
import CanvasJSReact from './canvasjs/canvasjs.react'
import './App.css'
import { countriesOfInterest as defaultCountriesOfInterest } from './config'

const CanvasJSChart = CanvasJSReact.CanvasJSChart;

class App extends React.Component {
  constructor (props) {
    super(props)
    const countriesOfInterest = localStorage.getItem('countriesOfInterest') ?? defaultCountriesOfInterest.join(';')
    this.state = {
      data: [],
      total: [],
      selectedChartIndex: 0,
      countriesOfInterest,
      countriesOfInterestPending: countriesOfInterest,
      countriesOfInterestDataPoints: []
    }
  }

  sumDateValues = (array, date) => {
    return parseInt(array.map(i => i[date]).reduce((prev, current) => parseInt(prev) + parseInt(current)))
  }

  mapData = (data) => {
    const countries = _.uniqBy(data, i => i["Country/Region"]).map(i => i["Country/Region"])
    const dates = _.uniq(data.map(i => Object.keys(i).filter(key => /\d+\/\d+\/\d+/.test(key))).flat())
    const countriesData = countries.map(country => {
      const provinces = data.filter(i => i["Country/Region"] === country)
      const dataPoints = dates.map(date => ({
        x: new Date(date),
        y: this.sumDateValues(provinces, date)
      }))
      return { country, dataPoints }
    })
    const total = dates.map(date => ({
      x: new Date(date),
      y: this.sumDateValues(data, date)
    }))
    return {
      countries: countriesData,
      total
    }
  }

  async fetchData (url) {
    const response = await fetch(url)
    const text = await response.text()
    const csvData = await csv().fromString(text)
    const mappedData = this.mapData(csvData)
    return mappedData
  }

  getInfectedAmount (confirmedDataPoints, deathsDataPoints, recoveredDataPoints, index) {
    return confirmedDataPoints[index].y - deathsDataPoints[index].y - recoveredDataPoints[index].y
  }

  filterNilDataPoints = (dataPoints) => {
    return dataPoints?.filter(({ y }) => y > 0) ?? []
  }

  mapDataPoints = (confirmedDataPoints, deathsDataPoints, recoveredDataPoints) => {
    const otherDataPoints = confirmedDataPoints.map((confirmedDataPoint, index2) => {
      const dY = deathsDataPoints[index2].y
      const rY = recoveredDataPoints[index2].y
      const infectedY = this.getInfectedAmount(confirmedDataPoints, deathsDataPoints, recoveredDataPoints, index2)
      const dailyNewCasesY = index2 === 0 ? 0 : confirmedDataPoint.y - confirmedDataPoints[index2 - 1].y
      return {
        x: confirmedDataPoint.x,
        activeY: infectedY,
        deathRateY: dY / (rY + dY),
        infectionRateY: index2 === 0 ? 0 : infectedY / this.getInfectedAmount(confirmedDataPoints, deathsDataPoints, recoveredDataPoints, index2 - 1),
        dailyNewCasesY,
      }
    })
    return {
      confirmed: confirmedDataPoints,
      deaths: deathsDataPoints,
      recovered: recoveredDataPoints,
      active: otherDataPoints.map(o => ({ x: o.x, y: o.activeY })),
      deathRate: otherDataPoints.map(o => ({ x: o.x, y: o.deathRateY })),
      infectionRate: otherDataPoints.map(o => ({ x: o.x, y: o.infectionRateY })),
      dailyNewCases: otherDataPoints.map(o => ({ x: o.x, y: o.dailyNewCasesY })),
    }
  }

  async componentDidMount () {
    const confirmedData = await this.fetchData('https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_19-covid-Confirmed.csv')
    const deathsData = await this.fetchData('https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_19-covid-Deaths.csv')
    const recoveredData = await this.fetchData('https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_19-covid-Recovered.csv')
    const data = confirmedData.countries.map(({country}, index) => ({
      country,
      dataPoints: this.mapDataPoints(confirmedData.countries[index].dataPoints, deathsData.countries[index].dataPoints, recoveredData.countries[index].dataPoints)
    }))
    const total = this.mapDataPoints(confirmedData.total, deathsData.total, recoveredData.total)
    this.setState({ data, total }, () => {
      const countriesOfInterestDataPoints = this.getCountriesOfInterestDataPoints(this.state.countriesOfInterest)
      this.setState({ countriesOfInterestDataPoints })
    })
  }

  renderChart = (data, title, axisYOptions) => {
    const options = {
      animationEnabled: true,
      title: {
        text: title
      },
      axisY : {
        includeZero: false,
        ...axisYOptions
      },
      toolTip: {
        shared: true
      },
      data
    }
    return (
      <CanvasJSChart options={options} />
    )
  }

  getLinearDataPoints = (deaths, recovered, infected) => {
    return [
      {
        color: "red",
        type: "spline",
        name: "Deaths",
        showInLegend: true,
        dataPoints: this.filterNilDataPoints(deaths)
      },
      {
        color: "green",
        type: "spline",
        name: "Recovered",
        showInLegend: true,
        dataPoints: this.filterNilDataPoints(recovered)
      },
      {
        color: "orange",
        type: "spline",
        name: "Infected",
        showInLegend: true,
        dataPoints: this.filterNilDataPoints(infected)
      }
    ]
  }

  getRateDataPoints = (deathRate, infectionRate) => {
    return [
      {
        color: "red",
        type: "spline",
        name: "Death rate",
        showInLegend: true,
        dataPoints: this.filterNilDataPoints(deathRate)
      },
      {
        color: "orange",
        type: "spline",
        name: "Infection growth rate",
        showInLegend: true,
        dataPoints: this.filterNilDataPoints(infectionRate)
      }
    ]
  }

  getDailyNewCasesDataPoints = (dailyNewCases) => {
    return [
      {
        color: "orange",
        type: "spline",
        name: "Daily new cases",
        showInLegend: true,
        dataPoints: this.filterNilDataPoints(dailyNewCases)
      }
    ]
  }

  renderCharts = (title, { deaths, recovered, active, deathRate, infectionRate, dailyNewCases }) => {
    return (
      <div key={title}>
        <p>{title}</p>
        <div style={{ display: 'flex' }}>
          {this.renderChart(this.getLinearDataPoints(deaths, recovered, active), 'Linear')}
          {this.renderChart(this.getLinearDataPoints(deaths, recovered, active), 'Logarithmic', { logarithmic: true })}
          {this.renderChart(this.getRateDataPoints(deathRate, infectionRate), 'Rates', { valueFormatString: "#%", minimum: 0 })}
          {this.renderChart(this.getDailyNewCasesDataPoints(dailyNewCases), 'Daily new cases')}
        </div>
      </div>
    )
  }

  handleCountriesOfInterestChange (e) {
    this.setState({ countriesOfInterestPending: e.target.value })
  }

  handleCountriesOfInterestSubmit = e => {
    e.preventDefault()
    const countriesOfInterest = this.state.countriesOfInterestPending
    localStorage.setItem('countriesOfInterest', countriesOfInterest)
    this.setState({
      countriesOfInterest,
      countriesOfInterestDataPoints: this.getCountriesOfInterestDataPoints(countriesOfInterest)
    })
  }

  getCountriesOfInterestDataPoints = (countriesOfInterest) => {
    const { data } = this.state
    const countriesOfInterestDP = countriesOfInterest.split(';').map(countryOfInterest => {
      const dataPoints = data?.find(i => i.country.toLowerCase() === countryOfInterest.toLowerCase())?.dataPoints
      console.log({ dataPoints })
      return {
        country: countryOfInterest,
        dataPoints
      }
    })
    return countriesOfInterestDP
  }

  render () {
    const { countriesOfInterestDataPoints } = this.state
    return (
      <div className="App">
        <div style={{
          backgroundColor: '#282c34',
          minHeight: '100vh',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 'calc(10px + 2vmin)',
          color: 'white'
        }}>
          <form onSubmit={this.handleCountriesOfInterestSubmit}>
            <label htmlFor='countriesOfInterest'>Countries of interest (Separate with semicolon)</label>
            <input value={this.state.countriesOfInterestPending} onChange={this.handleCountriesOfInterestChange.bind(this)} name='countriesOfInterest' />
          </form>
          {this.renderCharts('Total', this.state.total)}
          {countriesOfInterestDataPoints.map(({ country, dataPoints }) => dataPoints && this.renderCharts(country, dataPoints))}
        </div>
      </div>
    );
  }
}

export default App;
