import { Router } from "express";
import { authorRouter } from "./authors.js";
import { bookRouter } from "./books.js";
import { categoryRouter } from "./categories.js";

const router = Router();

router.use('/authors', authorRouter);
router.use('/books', bookRouter);
router.use('/categories', categoryRouter);

export default router;