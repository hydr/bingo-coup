import App from './App.svelte'
import { mount } from 'svelte'
import './styles/app.css'

const target = document.getElementById('app')
if (!target) throw new Error('#app fehlt im HTML')

export default mount(App, { target })
