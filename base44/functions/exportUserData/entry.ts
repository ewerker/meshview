import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ENTITY_NAMES = ['MeshNode', 'MeshPacket', 'MeshDeviceConfig'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = {};

    for (const entityName of ENTITY_NAMES) {
      data[entityName] = await base44.asServiceRole.entities[entityName].filter({ created_by: user.email });
    }

    return Response.json({
      exported_at: new Date().toISOString(),
      user_email: user.email,
      entities: ENTITY_NAMES,
      data,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});