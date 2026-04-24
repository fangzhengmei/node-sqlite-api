import { Router } from "express";
import { authorRouter } from "./authors.js";
import { bookRouter } from "./books.js";
import { userRouter } from "./users.js";

const router = Router();

router.use('/users', userRouter);
router.use('/authors', authorRouter);
router.use('/books',bookRouter);

export default router;