/* eslint-disable */
import axios from 'axios';
import { showAlert } from './alerts';

export const getUsers = async filter => {
  try {
    const url = `manageUsers?${
      !filter.page || filter.page == '1' ? '' : `&page=${filter.page}`
    }${!filter.role || filter.role == '1' ? '' : `&role=${filter.role}`}${
      !filter.sex || filter.sex == '1' ? '' : `&sex=${filter.sex}`
    }${filter.role ? '' : `&role=${filter.role}`}${
      !filter.teacher || filter.teacher == '1'
        ? ''
        : `&teacher=${filter.teacher}`
    }${
      !filter.birthYear || filter.birthYear == '1'
        ? ''
        : `&birthYear=${filter.birthYear}`
    }${!filter.name || filter.name == '1' ? '' : `&search=${filter.name}`}`;

    location.assign(url);
  } catch (err) {
    showAlert('error', err.response.data.message);
  }
};

export const getStudents = async filter => {
  try {
    const url = `/students${
      !filter.teacher || filter.teacher == '1' ? '' : `/${filter.teacher}`
    }?${!filter.page || filter.page == '1' ? '' : `&page=${filter.page}`}${
      !filter.sex || filter.sex == '1' ? '' : `&sex=${filter.sex}`
    }${!filter.group || filter.group == '' ? '' : `&group=${filter.group}`}${
      !filter.birthYear || filter.birthYear == '1'
        ? ''
        : `&birthYear=${filter.birthYear}`
    }${!filter.name || filter.name == '1' ? '' : `&search=${filter.name}`}`;

    location.assign(url);
  } catch (err) {
    showAlert('error', err.response.data.message);
  }
};
