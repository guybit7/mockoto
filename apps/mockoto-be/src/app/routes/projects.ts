import { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { db } from '../db/index';
import { projects } from '../db/schema';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { CreateProjectSchema, UpdateProjectSchema } from '@mockoto/shared';

export default async function projectRoutes(fastify: FastifyInstance) {
  fastify.get('/projects', async () => {
    return db.select().from(projects);
  });

  fastify.get<{ Params: { id: string } }>(
    '/projects/:id',
    async (req, reply) => {
      const { id } = req.params;
      const [project] = await db.select().from(projects).where(eq(projects.id, id));
      if (!project) return reply.code(404).send({ message: 'Project not found' });
      return project;
    },
  );

  fastify.post('/projects', async (req, reply) => {
    const body = CreateProjectSchema.parse(req.body);
    const [project] = await db
      .insert(projects)
      .values({ id: randomUUID(), ...body })
      .returning();
    return reply.code(201).send(project);
  });

  fastify.put<{ Params: { id: string } }>(
    '/projects/:id',
    async (req, reply) => {
      const { id } = req.params;
      const body = UpdateProjectSchema.parse(req.body);

      const [existing] = await db.select().from(projects).where(eq(projects.id, id));
      if (!existing) return reply.code(404).send({ message: 'Project not found' });

      const [updated] = await db
        .update(projects)
        .set({ ...body, updatedAt: Math.floor(Date.now() / 1000) })
        .where(eq(projects.id, id))
        .returning();
      return updated;
    },
  );

  fastify.delete<{ Params: { id: string } }>(
    '/projects/:id',
    async (req, reply) => {
      const { id } = req.params;
      const [existing] = await db.select().from(projects).where(eq(projects.id, id));
      if (!existing) return reply.code(404).send({ message: 'Project not found' });

      await db.delete(projects).where(eq(projects.id, id));
      return reply.code(204).send();
    },
  );
}
