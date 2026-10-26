// Server/tooling catalog wrapper. Client callers use the pure source adapter.
import catalog from '../../content/runtime/hsk1-level-rich-lessons.json';
import { createPilotSourceGraph } from '../personalization/pilotSourceGraph';
export const createPilotCompetencyGraph = (sourceCatalog: unknown = catalog) => createPilotSourceGraph(sourceCatalog);
