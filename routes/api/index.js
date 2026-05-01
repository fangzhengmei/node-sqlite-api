import { Router } from "express";
import { authorRouter } from "./authors.js";
import { bookRouter } from "./books.js";
import { lendingRouter } from "./lending.js";

const router = Router();

router.use('/authors', authorRouter);
router.use('/books',bookRouter);
router.use('/lending', lendingRouter);

export default router;