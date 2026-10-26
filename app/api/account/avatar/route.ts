import { createAccountAvatarHandlers } from '../../../../src/server/accountAvatarRoute';
export const dynamic = 'force-dynamic';
const handlers = createAccountAvatarHandlers();
export const GET = handlers.GET;
export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;
