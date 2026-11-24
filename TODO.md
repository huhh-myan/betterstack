# TODO

- [ ] **Cascade-delete website ticks.** `WebsiteTicks.website_id` references `Website.id` with no
  `onDelete` rule, so deleting a website that has ticks fails on the foreign key. Add
  `onDelete: Cascade` to the `website` relation on `WebsiteTicks` in
  `packages/db-prisma/src/prisma/contract.prisma`, re-emit the contract, and migrate. Until then,
  `DELETE /user/website/:id` must delete the website's ticks first.
