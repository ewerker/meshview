import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ENTITY_NAMES = ['MeshNode', 'MeshPacket', 'MeshDeviceConfig'];
const BUILT_IN_FIELDS = ['id', 'created_date', 'updated_date', 'created_by'];

function cleanRecord(record) {
  const cleaned = { ...record };
  for (const field of BUILT_IN_FIELDS) {
    delete cleaned[field];
  }
  return cleaned;
}

function getRecordKey(entityName, record) {
  if (entityName === 'MeshNode') return `${record.my_node_num || ''}:${record.num || ''}`;
  if (entityName === 'MeshDeviceConfig') return `${record.my_node_num || ''}:${record.category || ''}:${record.section || ''}`;
  if (entityName === 'MeshPacket') return `${record.my_node_num || ''}:${record.seq || ''}:${record.time || ''}:${record.type || ''}`;
  return null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const mode = payload?.mode === 'replace' ? 'replace' : 'merge';
    const inputData = payload?.data?.data || payload?.data || {};
    const result = {};

    for (const entityName of ENTITY_NAMES) {
      const incoming = Array.isArray(inputData[entityName]) ? inputData[entityName] : [];
      const existing = await base44.asServiceRole.entities[entityName].filter({ created_by: user.email });

      if (mode === 'replace') {
        for (const record of existing) {
          await base44.asServiceRole.entities[entityName].delete(record.id);
        }

        const recordsToCreate = incoming.map(cleanRecord);
        if (recordsToCreate.length > 0) {
          await base44.entities[entityName].bulkCreate(recordsToCreate);
        }

        result[entityName] = { deleted: existing.length, created: recordsToCreate.length, updated: 0 };
        continue;
      }

      const existingByKey = new Map(existing.map(record => [getRecordKey(entityName, record), record]).filter(([key]) => key));
      let created = 0;
      let updated = 0;

      for (const record of incoming) {
        const cleaned = cleanRecord(record);
        const key = getRecordKey(entityName, record);
        const existingRecord = key ? existingByKey.get(key) : null;

        if (existingRecord) {
          await base44.entities[entityName].update(existingRecord.id, cleaned);
          updated += 1;
        } else {
          await base44.entities[entityName].create(cleaned);
          created += 1;
        }
      }

      result[entityName] = { deleted: 0, created, updated };
    }

    return Response.json({ mode, result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});