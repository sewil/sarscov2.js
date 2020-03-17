import React from 'react'
import csv from 'csvtojson'
import _ from 'lodash'
import logo from './logo.svg'
import CanvasJSReact from './canvasjs/canvasjs.react'
import './App.css'

const CanvasJSChart = CanvasJSReact.CanvasJSChart;

class App extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      data: [],
      selectedChartIndex: 0
    }
  }

  mapData = (data) => {
    const countries = _.uniqBy(data, i => i["Country/Region"]).map(i => i["Country/Region"])
    const dates = _.uniq(data.map(i => Object.keys(i).filter(key => /\d+\/\d+\/\d+/.test(key))).flat())
    const b = countries.map(country => {
      const provinces = data.filter(i => i["Country/Region"] === country)
      const dataPoints = dates.map(date => ({
        x: new Date(date),
        y: parseInt(provinces.map(i => i[date]).reduce((prev, current) => parseInt(prev) + parseInt(current)))
      }))
      return { country, dataPoints }
    })
    return b
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

  async componentDidMount () {
    const confirmedData = await this.fetchData('https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_19-covid-Confirmed.csv')
    const deathsData = await this.fetchData('https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_19-covid-Deaths.csv')
    const recoveredData = await this.fetchData('https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_19-covid-Recovered.csv')
    const data = confirmedData.map((confirmed, index) => {
      const confirmedDataPoints = confirmed.dataPoints
      const deathsDataPoints = deathsData[index].dataPoints
      const recoveredDataPoints = recoveredData[index].dataPoints
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
        country: confirmed.country,
        dataPoints: {
          confirmed: confirmedDataPoints,
          deaths: deathsDataPoints,
          recovered: recoveredDataPoints,
          active: otherDataPoints.map(o => ({ x: o.x, y: o.activeY })),
          deathRate: otherDataPoints.map(o => ({ x: o.x, y: o.deathRateY })),
          infectionRate: otherDataPoints.map(o => ({ x: o.x, y: o.infectionRateY })),
        }
      }
    })
    this.setState({ data: [...data, {
      country: "Total",
      dataPoints: {
        confirmed: data.reduce((previous, current) => ({
          previous.confirmed
          dataPoints.confirmed.reduce()
        }))
      }
    }] })
  }
  
  renderChart = () => {
    const { data, selectedChartIndex } = this.state
    if (!data.length || data.length < selectedChartIndex || selectedChartIndex < 0) {
      return null
    }
    const { country, dataPoints } = data[selectedChartIndex]
    console.log({ country, dataPoints })
    const options = {
      animationEnabled: true,
      title:{
        text: country
      },
      axisY : {
        title: "Amount",
        includeZero: false
      },
      toolTip: {
        shared: true
      },
      data: [
        {
          color: "grey",
          type: "spline",
          name: "Total cases",
          showInLegend: true,
          dataPoints: dataPoints.confirmed
        },
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
      <CanvasJSChart key={country} options={options} />
    )
  }

  renderRateChart = () => {
    const { data, selectedChartIndex } = this.state
    if (!data.length || data.length < selectedChartIndex || selectedChartIndex < 0) {
      return null
    }
    const { country, dataPoints } = data[selectedChartIndex]
    const options = {
      animationEnabled: true,
      title:{
        text: country
      },
      axisY : {
        title: "Rate",
        includeZero: false
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
      <CanvasJSChart key={`${country}-rate-chart`} options={options} />
    )
  }
  render () {
    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <p>
            Edit <code>src/App.js</code> and save to reload.
          </p>
          <a
            className="App-link"
            href="https://reactjs.org"
            target="_blank"
            rel="noopener noreferrer"
          >
            Learn React
          </a>
          {this.renderChart()}
          {this.renderRateChart()}
          <div onClick={() => this.setState(p => ({ selectedChartIndex: p.selectedChartIndex - 1 }))}>Prev</div>
          <div onClick={() => this.setState(p => ({ selectedChartIndex: p.selectedChartIndex + 1 }))}>Next</div>
        </header>
      </div>
    );
  }
}

export default App;
