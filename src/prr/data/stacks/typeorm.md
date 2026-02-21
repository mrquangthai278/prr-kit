# TypeORM — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `@Entity(`, `@Column(`, `@PrimaryGeneratedColumn`, `TypeORM`, `DataSource`, `createConnection`, `getRepository(`

---

## Security

- **[CRITICAL]** `createQueryBuilder().where(\`id = ${userId}\`)` → SQL injection. Always use parameterized: `.where("id = :id", { id: userId })`.
- **[HIGH]** Entity returned directly from controller → exposes all columns. Use DTOs and `@Exclude()` / `plainToClass`.
- **[MEDIUM]** `getManager().query()` with string interpolation → injection. Use parameterized.

---

## Performance

- **[HIGH]** N+1 — accessing relation (`entity.relation`) in loop without `relations` option or `leftJoinAndSelect`. Use `find({ relations: ['relation'] })`.
- **[HIGH]** `find()` without `take`/`skip` on large tables → unbounded result.
- **[HIGH]** Missing `@Index()` on columns used in `where`, `order`, `join`.
- **[MEDIUM]** Using `getRepository()` inside function calls → creates new repository instance each time. Get repository once outside.
- **[MEDIUM]** Multiple separate queries that could be wrapped in `queryRunner.startTransaction()`.
- **[LOW]** `eager: true` on relation → always loaded even when not needed.

---

## Architecture

- **[HIGH]** TypeORM entity used as DTO directly → couples DB schema to API contract.
- **[MEDIUM]** `getConnection()` (deprecated) instead of `DataSource.getRepository()`.
- **[MEDIUM]** Missing `@Transaction()` decorator or manual transaction on multi-step writes.

---

## Common Bugs & Pitfalls

- **[HIGH]** `save()` on partial entity object → fields not included default to `undefined`, overwriting existing values with NULL.
- **[MEDIUM]** `@BeforeInsert` / `@BeforeUpdate` hooks not firing on `update()` query builder — hooks only fire on `save()`.
- **[MEDIUM]** `cascade: true` on relation without understanding → unintended deletes or inserts.
- **[LOW]** Missing `synchronize: false` in production config → TypeORM auto-migrates schema, dangerous on live DB.
