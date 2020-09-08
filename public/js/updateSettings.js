/* eslint-disable */
import axios from 'axios';
import { showAlert } from './alerts';

// const port = process.env.PORT || 3000;
// console.log(port);

// type is either 'password' or 'data'
export const updateSettings = async (data, type) => {
  try {
    // console.log(data, type);
    const id = new URL(window.location).pathname.split('/')[2];
    let url;
    console.log(id);
    if (!id) {
      url =
        type === 'password'
          ? `http://localhost:8080/api/v1/users/updateMyPW`
          : `http://localhost:8080/api/v1/users/updateMe`;
    } else {
      url = `http://localhost:8080/api/v1/users/${id}`;
    }
    console.log(1, url);

    const res = await axios({
      method: 'PATCH',
      url,
      data
    });

    // console.log(res.data.status);
    if (res.data.status === 'success') {
      showAlert('success', `${type.toUpperCase()} updated successfully!`);
    }
  } catch (err) {
    showAlert('error', err.response.data.message);
  }
};

export const deleteUser = async () => {
  try {
    // console.log(data, type);
    const id = new URL(window.location).pathname.split('/')[2];
    let url;
    console.log(id);
    if (!id) {
      showAlert('error', "Vous n'êtes pas autorisé à supprimer un utilisateur");
    } else {
      url = `http://localhost:8080/api/v1/users/${id}`;
    }
    console.log(1, url);

    const res = await axios({
      method: 'DELETE',
      url
    });

    console.log(res.data.status);
    if (res.data.status === 'success') {
      showAlert('success', 'Utilisateur supprimé!');
      window.setTimeout(() => {
        location.assign('/manageUsers');
      }, 1500);
    }
  } catch (err) {
    showAlert('error', err.response.data.message);
  }
};

export const update_group = async (group, id) => {
  try {
    // console.log(data, type);
    const url = `http://localhost:8080/api/v1/users/${id}`;

    const data = { group: group };

    const res = await axios({
      method: 'PATCH',
      url,
      data
    });

    // console.log(res.data.status);
    if (res.data.status === 'success') {
      showAlert('success', 'Modification effectuée');
    }
  } catch (err) {
    showAlert('error', err.response.data.message);
  }
};
