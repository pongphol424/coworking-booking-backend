import { Router } from 'express';
import { validate } from '../middlewares/validate.middleware';
import { authUser, login, logout, register } from '../controller/auth';
import { loginSchema, registerSchema } from '../schema/auth.schema';
import { isAuthenticated } from '../middlewares/auth.middleware';


const router = Router();

router.post('/register',validate(registerSchema),register);
router.post('/login',validate(loginSchema),login);
router.post('/logout',logout);
router.get('/authUser',isAuthenticated,authUser)


export default router;