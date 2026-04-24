import { Router } from "express";
import { authorRouter } from "./authors.js";
import { bookRouter } from "./books.js";
import { readerRouter } from "./readers.js";
import { borrowRouter } from "./borrows.js";

const router = Router();

router.use('/authors', authorRouter);
router.use('/books', bookRouter);
router.use('/readers', readerRouter);
router.use('/borrows', borrowRouter);

export default router;