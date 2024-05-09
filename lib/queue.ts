import Queue from "bee-queue";
import { worker } from "./worker";

export const queue = new Queue("posts");

queue.process(20, worker);
