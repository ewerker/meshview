import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Use service role to bypass RLS for debugging
        const nodes = await base44.asServiceRole.entities.MeshNode.list('-created_date', 1000);
        
        return Response.json({ count: nodes.length });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});