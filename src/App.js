import React from 'react'
import csv from 'csvtojson'
import _ from 'lodash'
import logo from './logo.svg'
import CanvasJSReact from './canvasjs/canvasjs.react'
import './App.css'

const CanvasJSChart = CanvasJSReact.CanvasJSChart;

const countriesOfInterest = [
  'China',
  'Italy',
  'US',
  'Sweden'
]

class App extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      data: [],
      total: [],
      selectedChartIndex: 0
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

  mapDataPoints = (confirmedDataPoints, deathsDataPoints, recoveredDataPoints) => {
    const otherDataPoints = confirmedDataPoints.map((confirmedDataPoint, index2) => {
      const dY = deathsDataPoints[index2].y
      const rY = recoveredDataPoints[index2].y
      const infectedY = this.getInfectedAmount(confirmedDataPoints, deathsDataPoints, recoveredDataPoints, index2)
      return {
        x: confirmedDataPoint.x,
        activeY: infectedY,
        deathRateY: dY / (rY + dY),
        infectionRateY: index2 === 0 ? 0 : infectedY / this.getInfectedAmount(confirmedDataPoints, deathsDataPoints, recoveredDataPoints, index2 - 1),
      }
    })
    return {
      confirmed: confirmedDataPoints,
      deaths: deathsDataPoints,
      recovered: recoveredDataPoints,
      active: otherDataPoints.map(o => ({ x: o.x, y: o.activeY })),
      deathRate: otherDataPoints.map(o => ({ x: o.x, y: o.deathRateY })),
      infectionRate: otherDataPoints.map(o => ({ x: o.x, y: o.infectionRateY })),
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
    this.setState({ data, total })
  }

  renderChart = (dataPoints, title, axisYOptions) => {
    const options = {
      animationEnabled: true,
      title:{
        text: title
      },
      axisY : {
        title: "Amount",
        includeZero: false,
        ...axisYOptions
      },
      toolTip: {
        shared: true
      },
      data: [
        {
          color: "red",
          type: "spline",
          name: "Deaths",
          showInLegend: true,
          dataPoints: dataPoints.deaths
        },
        {
          color: "green",
          type: "spline",
          name: "Recovered",
          showInLegend: true,
          dataPoints: dataPoints.recovered
        },
        {
          color: "orange",
          type: "spline",
          name: "Infected",
          showInLegend: true,
          dataPoints: dataPoints.active
        }
      ]
    }
    return (
      <CanvasJSChart options={options} />
    )
  }

  renderRateChart = (dataPoints) => {
    const options = {
      animationEnabled: true,
      title:{
        text: 'Rates'
      },
      axisY : {
        title: "Rate",
        includeZero: false,
        valueFormatString: "#%"
      },
      toolTip: {
        shared: true
      },
      data: [
        {
          color: "red",
          type: "spline",
          name: "Death rate",
          showInLegend: true,
          dataPoints: dataPoints.deathRate
        },
        {
          color: "orange",
          type: "spline",
          name: "Infection rate",
          showInLegend: true,
          dataPoints: dataPoints.infectionRate
        }
      ]
    }
    return (
      <CanvasJSChart options={options} />
    )
  }

  renderCharts = (title, dataPoints) => {
    return (
      <>
        <p>{title}</p>
        <div style={{
          display: 'flex'
        }}>
          {this.renderChart(dataPoints, 'Linear')}
          {this.renderChart(dataPoints, 'Logarithmic', { logarithmic: true })}
          {this.renderRateChart(dataPoints)}
        </div>
      </>
    )
  }

  render () {
    const countriesOfInterestDP = countriesOfInterest.map(countryOfInterest => ({
      country: countryOfInterest,
      dataPoints: this.state.data?.find(i => i.country === countryOfInterest)?.dataPoints
    }))
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
          {this.renderCharts('Total', this.state.total)}
          {countriesOfInterestDP.map(({ country, dataPoints }) => dataPoints && this.renderCharts(country, dataPoints))}
        </div>
      </div>
    );
  }
}

export default App;
