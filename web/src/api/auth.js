import { post } from './client.js'

export const authApi = {
  login: (credentials) => post('/auth/login', credentials),
  register: (form) => post('/auth/register', form)
}
