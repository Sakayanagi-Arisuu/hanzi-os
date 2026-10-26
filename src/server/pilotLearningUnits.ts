// Server/tooling catalog wrapper. This module must not enter the learner bundle.
import catalog from '../../content/runtime/hsk1-level-rich-lessons.json';
import { extractPilotSourceUnits } from '../personalization/pilotSourceUnits';
export const extractPilotLearningUnits = (sourceCatalog: unknown = catalog) => extractPilotSourceUnits(sourceCatalog);
