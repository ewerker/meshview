import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ENTITY_NAMES = ['MeshNode', 'MeshPacket', 'MeshDeviceConfig'];
const EXPORT_LIMIT = 10000;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = {};
    const counts = {};

    for (const entityName of ENTITY_NAMES) {
      const records = await base44.entities[entityName].list('-created_date', EXPORT_LIMIT);
      data[entityName] = records;
      counts[entityName] = records.length;
    }

    return Response.json({
      exported_at: new Date().toISOString(),
      user_email: user.email,
      entities: ENTITY_NAMES,
      counts,
      data,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});