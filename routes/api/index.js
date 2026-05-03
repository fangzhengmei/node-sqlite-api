import { Router } from "express";
import { authorRouter } from "./authors.js";
import { bookRouter } from "./books.js";
import { borrowRouter } from "./borrows.js";
import { fineRouter } from "./fines.js";

const router = Router();

router.use('/authors', authorRouter);
router.use('/books', bookRouter);
router.use('/borrows', borrowRouter);
router.use('/fines', fineRouter);

export default router;