import { computed, onMounted, ref } from 'vue';
import axios from 'axios';

export const useRegistrationConfig = () => {
  const configState = ref('loading');
  let requestId = 0;
  const loadRegistrationConfig = async () => {
    const id = ++requestId;
    configState.value = 'loading';
    try {
      const { data } = await axios.get('/api/config', { timeout: 10000 });
      if (typeof data?.registrationEnabled !== 'boolean') throw new Error('Invalid configuration');
      if (id === requestId) configState.value = data.registrationEnabled ? 'enabled' : 'disabled';
    } catch {
      if (id === requestId) configState.value = 'error';
    }
  };
  onMounted(loadRegistrationConfig);
  return { configState, registrationEnabled: computed(() => configState.value === 'enabled'), loadRegistrationConfig };
};
