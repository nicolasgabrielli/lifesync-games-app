/**
 * Exportar todos los sensores
 */
import { StepCounterSensor } from './StepCounterSensor';
import { AppSessionsSensor } from './AppSessionsSensor';
import { PhoneUsageSensor } from './PhoneUsageSensor';
import { GithubContributionsSensor } from './GithubContributionsSensor';

export { StepCounterSensor } from './StepCounterSensor';
export { AppSessionsSensor } from './AppSessionsSensor';
export { PhoneUsageSensor } from './PhoneUsageSensor';
export { GithubContributionsSensor } from './GithubContributionsSensor';

/**
 * Factory para crear instancias de sensores
 */
export const createSensor = (sensorType, sensorId, category, onDataUpdate, onPointsUpdate) => {
  switch (sensorType) {
    case 'step_count':
      return new StepCounterSensor(sensorId, category, onDataUpdate, onPointsUpdate);
    
    case 'app_sessions':
      return new AppSessionsSensor(sensorId, category, onDataUpdate, onPointsUpdate);
    
    case 'phone_usage':
      return new PhoneUsageSensor(sensorId, category, onDataUpdate, onPointsUpdate);
    
    case 'github_contributions':
      return new GithubContributionsSensor(sensorId, category, onDataUpdate, onPointsUpdate);
    
    default:
      throw new Error(`Tipo de sensor no reconocido: ${sensorType}`);
  }
};

