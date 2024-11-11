import GalaceanModules from 'common/engine/GalaceanModules';
import rejectTextUtis from './TextUtils';

export default function reject(galaceanModules: GalaceanModules) {
  if (galaceanModules.core) {
    const core = galaceanModules.core;
    rejectTextUtis(core);
  }
}
