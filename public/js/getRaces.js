/* eslint-disable */
import axios from 'axios';
import { showAlert } from './alerts';

export const getRaces = async filter => {
  try {
    console.log(filter);
    const url = `historical?${
      !filter.page || filter.page === '1' ? '' : `&page=${filter.page}`
    }${
      !filter.distance || filter.distance === '1'
        ? ''
        : `&races.race.distance=${filter.distance}`
    }${
      !filter.name || filter.name === '1'
        ? ''
        : `&races.race.name=${filter.name}`
    }${
      !filter.size || filter.size === '1' ? '' : `&races.size=${filter.size}`
    }${
      !filter.season || filter.season === '1' ? '' : `&season=${filter.season}`
    }`;

    console.log(url);
    location.assign(url);
  } catch (err) {
    showAlert('error', err.response.data.message);
  }
};
