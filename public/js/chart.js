/* eslint-disable */
import axios from 'axios';
import { showAlert } from './alerts';

function sectomin2(time) {
  let min = Math.floor(-time / 60).toString(10);
  let sec =
    (Math.round(100 * (-time % 60)) / 100).toString(10).split('.')[0].length ==
    2
      ? (Math.round(100 * (-time % 60)) / 100).toString(10).split('.')[0]
      : '0'.concat(
          '',
          (Math.round(100 * (-time % 60)) / 100).toString(10).split('.')[0]
        );

  return min.concat("'", sec).concat("''", '');
}

export const getPersonalStats = async (distance, name, compareBy, student) => {
  // -- API Request --
  console.log(student ? 1 : 2);
  let res;
  if (student) {
    res = await axios({
      method: 'GET',
      url: `http://127.0.0.1:8080/api/v1/races/stats/${distance}/${name}/${compareBy}/${student}`
    });
  } else {
    res = await axios({
      method: 'GET',
      url: `http://127.0.0.1:8080/api/v1/races/stats/${distance}/${name}/${compareBy}`
    });
  }
  console.log(res);

  // ------------------------------------------------------------------------------
  // -- Perso
  // ------------------------------------------------------------------------------

  // -- Labels --
  const labels = res.data.data.racesPersoByDate.map(
    el =>
      `${new Date(Date.parse(el.races.date)).getUTCDay()}/${new Date(
        Date.parse(el.races.date)
      ).getMonth() + 1}/${new Date(Date.parse(el.races.date)).getFullYear()}`
  );

  // -- Data --
  const data = res.data.data.racesPersoByDate.map(el => -el.races.time);

  // -- Chart --
  var ctx = document.getElementById('myChart').getContext('2d');
  var chart = new Chart(ctx, {
    // The type of chart we want to create
    type: 'line',

    // The data for our dataset
    data: {
      labels,
      datasets: [
        {
          label: `${distance} ${name}`,
          borderColor: '#81ecec',
          backgroundColor: ['transparent'],
          borderWidth: 1,
          data
        }
      ]
    },

    // Configuration options go here
    options: {
      scales: {
        yAxes: [
          {
            ticks: {
              beginAtZero: false,
              callback: function(value, index, values) {
                return sectomin2(value);
              }
            }
          }
        ]
      }
    }
  });

  // ------------------------------------------------------------------------------
  // -- Compare
  // ------------------------------------------------------------------------------

  // -- Constantes --

  const avg = `${Math.trunc(res.data.data.statsPerso[0].avgRaking / 60)}'${
    (
      Math.round(
        (res.data.data.statsPerso[0].avgRaking -
          Math.trunc(res.data.data.statsPerso[0].avgRaking / 60) * 60) *
          100
      ) / 100
    )
      .toString()
      .split('.')[0]
  }"${
    (
      Math.round(
        (res.data.data.statsPerso[0].avgRaking -
          Math.trunc(res.data.data.statsPerso[0].avgRaking / 60) * 60) *
          100
      ) / 100
    )
      .toString()
      .split('.')[1]
  }`;
  const med = `${Math.trunc(res.data.data.MQ.mediane / 60)}'${
    (
      Math.round(
        (res.data.data.MQ.mediane -
          Math.trunc(res.data.data.MQ.mediane / 60) * 60) *
          100
      ) / 100
    )
      .toString()
      .split('.')[0]
  }"${
    (
      Math.round(
        (res.data.data.MQ.mediane -
          Math.trunc(res.data.data.MQ.mediane / 60) * 60) *
          100
      ) / 100
    )
      .toString()
      .split('.')[1]
  }`;
  const fstQ = `${Math.trunc(res.data.data.MQ.fstQuartile / 60)}'${
    (
      Math.round(
        (res.data.data.MQ.fstQuartile -
          Math.trunc(res.data.data.MQ.fstQuartile / 60) * 60) *
          100
      ) / 100
    )
      .toString()
      .split('.')[0]
  }"${
    (
      Math.round(
        (res.data.data.MQ.fstQuartile -
          Math.trunc(res.data.data.MQ.fstQuartile / 60) * 60) *
          100
      ) / 100
    )
      .toString()
      .split('.')[1]
  }`;

  const trdQ = `${Math.trunc(res.data.data.MQ.trdQuartile / 60)}'${
    (
      Math.round(
        (res.data.data.MQ.trdQuartile -
          Math.trunc(res.data.data.MQ.trdQuartile / 60) * 60) *
          100
      ) / 100
    )
      .toString()
      .split('.')[0]
  }"${
    (
      Math.round(
        (res.data.data.MQ.trdQuartile -
          Math.trunc(res.data.data.MQ.trdQuartile / 60) * 60) *
          100
      ) / 100
    )
      .toString()
      .split('.')[1]
  }`;
  const max = `${Math.trunc(res.data.data.statsPerso[0].minRaking / 60)}'${
    (
      Math.round(
        (res.data.data.statsPerso[0].minRaking -
          Math.trunc(res.data.data.statsPerso[0].minRaking / 60) * 60) *
          100
      ) / 100
    )
      .toString()
      .split('.')[0]
  }"${
    (
      Math.round(
        (res.data.data.statsPerso[0].minRaking -
          Math.trunc(res.data.data.statsPerso[0].minRaking / 60) * 60) *
          100
      ) / 100
    )
      .toString()
      .split('.')[1]
  }`;
  const min = `${Math.trunc(res.data.data.statsPerso[0].maxRaking / 60)}'${
    (
      Math.round(
        (res.data.data.statsPerso[0].maxRaking -
          Math.trunc(res.data.data.statsPerso[0].maxRaking / 60) * 60) *
          100
      ) / 100
    )
      .toString()
      .split('.')[0]
  }"${
    (
      Math.round(
        (res.data.data.statsPerso[0].maxRaking -
          Math.trunc(res.data.data.statsPerso[0].maxRaking / 60) * 60) *
          100
      ) / 100
    )
      .toString()
      .split('.')[1]
  }`;

  // -- Objects --

  document.getElementById(
    'nameRace'
  ).textContent = `${res.data.data.race.distance} ${res.data.data.race.name}`;
  document.getElementById(
    'nbRatings'
  ).textContent = `Nombre de course:  ${res.data.data.statsPerso[0].numRankings}`;
  nameRace;
  document.getElementById('avg').textContent = `Temps moyen: ${avg}`;
  document.getElementById('med').textContent = `Médiane:  ${med}`;
  document.getElementById('fstQ').textContent = `1er Quartiles:  ${fstQ}`;
  document.getElementById('trdQ').textContent = `3ème Quartiles:  ${trdQ}`;
  document.getElementById('max').textContent = `Reccord:  ${max}`;
  document.getElementById('min').textContent = `Minimum:  ${min}`;

  // -- Label --
  const labelsCompare = res.data.data.statsByComapareByDates.map(el => el._id);

  // -- Data --
  const dataCompare = res.data.data.statsByComapareByDates.map(
    el => -el.avgRaking
  );

  const dataPerso = [];
  const dataCompareMax = [];
  const dataCompareMin = [];

  res.data.data.statsPersoByComapareByDates.forEach(el => {
    dataPerso.push({ x: el._id, y: -el.avgRaking });
  });

  res.data.data.statsByComapareByDates.forEach(el => {
    dataCompareMax.push({ x: el._id, y: -el.maxRaking });
  });

  res.data.data.statsByComapareByDates.forEach(el => {
    dataCompareMin.push({ x: el._id, y: -el.minRaking });
  });

  console.log(labelsCompare, dataPerso, dataCompare);
  // -- Chart --
  var ctx2 = document.getElementById('myChart2').getContext('2d');
  var chart2 = new Chart(ctx2, {
    // The type of chart we want to create
    type: 'line',

    // The data for our dataset
    data: {
      labels: labelsCompare,
      datasets: [
        {
          label: `${compareBy}`,
          borderColor: '#81ecec',
          backgroundColor: ['transparent'],
          borderWidth: 1,
          data: dataCompare
        },
        {
          label: `Moyenne`,
          borderColor: '#74b9ff',
          backgroundColor: ['transparent'],
          borderWidth: 1,
          data: dataPerso
        },
        {
          label: `Minimum`,
          borderColor: '#ff7675',
          backgroundColor: ['transparent'],
          borderWidth: 1,
          data: dataCompareMax
        },
        {
          label: `Maximum`,
          borderColor: '#ffeaa7',
          backgroundColor: ['transparent'],
          borderWidth: 1,
          data: dataCompareMin
        }
      ]
    },

    // Configuration options go here
    options: {
      scales: {
        yAxes: [
          {
            ticks: {
              beginAtZero: false,
              callback: function(value, index, values) {
                return sectomin2(value);
              }
            }
          }
        ]
      }
    }
  });
};
