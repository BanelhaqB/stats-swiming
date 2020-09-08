/* eslint-disable */
import '@babel/polyfill';
import { login, logout } from './login';
import { updateSettings, deleteUser, update_group } from './updateSettings';
import { getUsers, getStudents } from './getUsers';
import { getPersonalStats } from './chart.js';
import { getRaces } from './getRaces';

// DOM ELEMENTS
const loginForm = document.querySelector('#form--login');
const logOutBtn = document.querySelector('.nav__el--logout');
const userDataForm = document.querySelector('.form-user-data');
const userPasswordForm = document.querySelector('.form-user-password');
const userFilterForm = document.querySelector('.form__filter-users');
const racesFilterForm = document.querySelector('.form__filter-races');
const prevPage = document.querySelector('#prevPage');
const nextPage = document.querySelector('#nextPage');
const deleteBtn = document.querySelector('#deleteBtn');
const updateGroupForm = document.querySelectorAll('.updateGroup');
const getPersonalStatsBtn = document.querySelector('#getPersonalStats');
const getCompareStatsBtn = document.querySelector('#getCompareStatsBtn');
const studentsFilterForm = document.querySelector('#studentsFilterForm');
const searchBar = document.querySelector('#search_name');

function updateQueryStringParameter(uri, key, value) {
  var re = new RegExp('([?&])' + key + '=.*?(&|$)', 'i');
  var separator = uri.indexOf('?') !== -1 ? '&' : '?';
  if (uri.match(re)) {
    return uri.replace(re, '$1' + key + '=' + value + '$2');
  } else {
    return uri + separator + key + '=' + value;
  }
}

if (loginForm) {
  loginForm.addEventListener('submit', e => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    login(email, password);
  });
}

if (logOutBtn) logOutBtn.addEventListener('click', logout);

if (userDataForm)
  userDataForm.addEventListener('submit', e => {
    e.preventDefault();
    console.log('user-page');
    const form = {
      firstName: document.getElementById('firstname').value,
      lastName: document.getElementById('lastname').value,
      birthYear: document.getElementById('birthYear').value,
      teacher: document.getElementById('teacher').value,
      email: document.getElementById('email').value,
      role: document.getElementById('role')
        ? document.getElementById('role').value
        : 'not-admin'
    };

    updateSettings(form, 'data');
  });

if (deleteBtn)
  deleteBtn.addEventListener('click', e => {
    e.preventDefault();

    deleteUser();
  });

if (userPasswordForm)
  userPasswordForm.addEventListener('submit', async e => {
    e.preventDefault();
    document.querySelector('#btn--save-password').textContent =
      'Mise à jour...';

    const passwordCurrent = document.getElementById('password-current').value;
    const password = document.getElementById('password').value;
    const passwordConfirm = document.getElementById('password-confirm').value;
    await updateSettings(
      { passwordCurrent, password, passwordConfirm },
      'password'
    );

    document.querySelector('#btn--save-password').textContent = 'Enregistrer';
    document.getElementById('password-current').value = '';
    document.getElementById('password').value = '';
    document.getElementById('password-confirm').value = '';
  });

if (userFilterForm) {
  const btns = document.querySelectorAll('.submitFilters');
  // Buttons
  btns.forEach(btn => {
    btn.addEventListener('click', async e => {
      e.preventDefault();
      const filter = {
        role: document.getElementById('role').value,
        sex: document.getElementById('sex').value,
        teacher: document.getElementById('teacher').value,
        birthYear: document.getElementById('birthYear').value,
        name: document.getElementById('search_name').value
      };
      console.log(filter);
      await getUsers(filter);
    });
  });
  userFilterForm.addEventListener('submit', async e => {
    e.preventDefault();
    const filter = {
      role: document.getElementById('role').value,
      sex: document.getElementById('sex').value,
      teacher: document.getElementById('teacher').value,
      birthYear: document.getElementById('birthYear').value,
      name: document.getElementById('search_name').value
    };
    console.log(filter);
    await getUsers(filter);
  });
}

if (studentsFilterForm) {
  const btns = document.querySelectorAll('.submitFilters');
  const teacher = new URL(window.location).pathname.split('/')[2].split('?')[0];
  // Buttons
  btns.forEach(btn => {
    btn.addEventListener('click', async e => {
      e.preventDefault();
      const filter = {
        sex: document.getElementById('sex').value,
        teacher,
        group: document.getElementById('group').value,
        birthYear: document.getElementById('birthYear').value,
        name: document.getElementById('search_name').value
      };
      console.log(filter);
      await getStudents(filter);
    });
  });
  studentsFilterForm.addEventListener('submit', async e => {
    e.preventDefault();
    const filter = {
      role: document.getElementById('role').value,
      sex: document.getElementById('sex').value,
      group: document.getElementById('group').value,
      teacher,
      birthYear: document.getElementById('birthYear').value,
      name: document.getElementById('search_name').value
    };
    console.log(filter);
    await getStudents(filter);
  });
}

if (racesFilterForm) {
  const btns = document.querySelectorAll('.racesFilterBtn');
  console.log(btns);

  // Buttons
  btns.forEach(btn => {
    console.log(btn);
    btn.addEventListener('click', async e => {
      e.preventDefault();
      const filter = {
        distance: document.getElementById('distance').value,
        name: document.getElementById('name').value,
        size: document.getElementById('size').value,
        season: document.getElementById('season').value
      };

      const search = searchBar.value;

      if (search) {
        filter.name = search;
      }

      await getRaces(filter);
    });
  });
  // studentsFilterForm.addEventListener('submit', async e => {
  //   e.preventDefault();
  //   const filter = {
  //     role: document.getElementById('role').value,
  //     sex: document.getElementById('sex').value,
  //     group: document.getElementById('group').value,
  //     teacher,
  //     birthYear: document.getElementById('birthYear').value,
  //     name: document.getElementById('search_name').value
  //   };
  //   console.log(filter);
  //   await getStudents(filter);
  // });
}

if (prevPage) {
  prevPage.addEventListener('click', e => {
    e.preventDefault();
    let url = new URL(window.location);
    const parmas = new URLSearchParams(url.search);

    const page = parmas.get('page') * 1 || 1;
    const prev_page = page - 1;

    url = updateQueryStringParameter(url.href, 'page', prev_page);
    location.assign(url);
  });
}

if (nextPage) {
  nextPage.addEventListener('click', e => {
    e.preventDefault();
    let url = new URL(window.location);
    const parmas = new URLSearchParams(url.search);

    const page = parmas.get('page') * 1 || 1;
    const next_page = page + 1;

    url = updateQueryStringParameter(url.href, 'page', next_page);
    location.assign(url);
  });
}

if (updateGroupForm) {
  updateGroupForm.forEach((updateGroup, i) => {
    updateGroup.addEventListener('submit', e => {
      e.preventDefault();
      const group = document.querySelectorAll('.input__group')[i].value;
      const id = document.querySelectorAll('.input__group')[i].dataset.id;
      console.log(group, id);
      update_group(group, id);
    });
  });
}
//-------------------------------------------------------
// -- Chart
//-------------------------------------------------------

const getStats = function() {
  const distance = document.getElementById('distance').value;
  const name = document.getElementById('name').value;
  const compareBy = document.getElementById('compareBy').value;

  let url = new URL(window.location);
  const student = url.search.substring(1);
  // console.log(student ? 1 : 2);

  if (student) {
    getPersonalStats(distance, name, compareBy, student);
  } else {
    getPersonalStats(distance, name, compareBy);
  }
};

if (getPersonalStatsBtn && getCompareStatsBtn) {
  getPersonalStatsBtn.addEventListener('click', getStats);
  getCompareStatsBtn.addEventListener('click', getStats);
}
