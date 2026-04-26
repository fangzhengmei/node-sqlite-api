import { Router } from "express";
import { authorRouter } from "./authors.js";
import { bookRouter } from "./books.js";
import { ratingRouter } from "./ratings.js";

const router = Router();

router.use('/authors', authorRouter);
router.use('/books', bookRouter);
router.use('/ratings', ratingRouter);

export default router;