import express from "express";
import { MessageModel, CreateMessageInput } from "../models/Message";
import { UserModel } from "../models/User";
import { authenticateJWT } from "../middleware/auth";
import { ObjectId } from "mongodb";

/**
 * @swagger
 * tags:
 *   name: Messages
 *   description: 메시지 관리 API
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Message:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: 메시지 ID
 *         fromUserId:
 *           type: string
 *           description: 발송자 ID
 *         targetUserId:
 *           type: string
 *           description: 수신자 ID
 *         toUserEmail:
 *           type: string
 *           description: 수신자 이메일
 *         subject:
 *           type: string
 *           description: 제목
 *         content:
 *           type: string
 *           description: 내용
 *         isRead:
 *           type: boolean
 *           description: 읽음 여부
 *         readAt:
 *           type: string
 *           format: date-time
 *           description: 읽은 시간
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: 생성 시간
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: 수정 시간
 *     CreateMessageRequest:
 *       type: object
 *       required:
 *         - targetUserId
 *         - subject
 *         - content
 *       properties:
 *         targetUserId:
 *           type: string
 *           description: 수신자 ID
 *         subject:
 *           type: string
 *           description: 제목
 *         content:
 *           type: string
 *           description: 내용
 */

const router = express.Router();

/**
 * @swagger
 * /message/send:
 *   post:
 *     summary: 메시지 발송
 *     tags: [Messages]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateMessageRequest'
 *     responses:
 *       201:
 *         description: 메시지가 성공적으로 발송되었습니다
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Message'
 *       400:
 *         description: 잘못된 요청 (수신자 ID, 제목, 내용 누락 또는 유효하지 않은 수신자 ID)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       401:
 *         description: 인증이 필요합니다
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       404:
 *         description: 수신자를 찾을 수 없습니다
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
router.post("/send", authenticateJWT, async (req, res) => {
  try {
    if (!req.isAuthenticated?.()) {
      return res.status(401).json({ error: "로그인이 필요합니다" });
    }

    const { targetUserId, subject, content } = req.body;

    if (!targetUserId || !subject || !content) {
      return res.status(400).json({ error: "수신자 ID, 제목, 내용은 필수입니다" });
    }

    // ObjectId 유효성 검사
    if (!ObjectId.isValid(targetUserId)) {
      return res.status(400).json({ error: "유효하지 않은 수신자 ID입니다" });
    }

    // 수신자가 존재하는지 확인
    const recipient = await UserModel.findById(targetUserId);
    if (!recipient) {
      return res.status(404).json({ error: "수신자를 찾을 수 없습니다" });
    }

    // 자기 자신에게 메시지 발송 방지
    if (req.user!._id!.toString() === targetUserId) {
      return res.status(400).json({ error: "자기 자신에게는 메시지를 발송할 수 없습니다" });
    }

    const messageData: CreateMessageInput = {
      fromUserId: req.user!._id!,
      targetUserId: ObjectId.createFromHexString(targetUserId),
      subject,
      content,
    };

    const message = await MessageModel.create(messageData);
    res.status(201).json(message);
  } catch (error) {
    console.error("메시지 발송 오류:", error);
    res.status(500).json({ error: "메시지 발송 중 오류가 발생했습니다" });
  }
});

/**
 * @swagger
 * /message/received:
 *   get:
 *     summary: 받은 메시지 목록 조회
 *     tags: [Messages]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: 받은 메시지 목록
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Message'
 *       401:
 *         description: 인증이 필요합니다
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
router.get("/received", authenticateJWT, async (req, res) => {
  try {
    if (!req.isAuthenticated?.()) {
      return res.status(401).json({ error: "로그인이 필요합니다" });
    }

    const messages = await MessageModel.findByTargetUserId(req.user!._id!);
    res.json(messages);
  } catch (error) {
    console.error("받은 메시지 조회 오류:", error);
    res.status(500).json({ error: "받은 메시지 조회 중 오류가 발생했습니다" });
  }
});

/**
 * @swagger
 * /message/sent:
 *   get:
 *     summary: 보낸 메시지 목록 조회
 *     tags: [Messages]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: 보낸 메시지 목록
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Message'
 *       401:
 *         description: 인증이 필요합니다
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
router.get("/sent", authenticateJWT, async (req, res) => {
  try {
    if (!req.isAuthenticated?.()) {
      return res.status(401).json({ error: "로그인이 필요합니다" });
    }

    const messages = await MessageModel.findByFromUserId(req.user!._id!);
    res.json(messages);
  } catch (error) {
    console.error("보낸 메시지 조회 오류:", error);
    res.status(500).json({ error: "보낸 메시지 조회 중 오류가 발생했습니다" });
  }
});

/**
 * @swagger
 * /message/{id}:
 *   get:
 *     summary: 특정 메시지 조회
 *     tags: [Messages]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: 메시지 ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 메시지 정보
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Message'
 *       401:
 *         description: 인증이 필요합니다
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       403:
 *         description: 접근 권한이 없습니다
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       404:
 *         description: 메시지를 찾을 수 없습니다
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
router.get("/:id", authenticateJWT, async (req, res) => {
  try {
    if (!req.isAuthenticated?.()) {
      return res.status(401).json({ error: "로그인이 필요합니다" });
    }

    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "유효하지 않은 메시지 ID입니다" });
    }

    const message = await MessageModel.findById(id);
    if (!message) {
      return res.status(404).json({ error: "메시지를 찾을 수 없습니다" });
    }

    // 메시지 접근 권한 확인 (발송자 또는 수신자만 조회 가능)
    const isAuthorized = 
      message.fromUserId.toString() === req.user!._id!.toString() ||
      message.targetUserId.toString() === req.user!._id!.toString();

    if (!isAuthorized) {
      return res.status(403).json({ error: "메시지에 접근할 권한이 없습니다" });
    }

    res.json(message);
  } catch (error) {
    console.error("메시지 조회 오류:", error);
    res.status(500).json({ error: "메시지 조회 중 오류가 발생했습니다" });
  }
});

/**
 * @swagger
 * /message/{id}/read:
 *   patch:
 *     summary: 메시지를 읽음으로 표시
 *     tags: [Messages]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: 메시지 ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 메시지가 읽음으로 표시되었습니다
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Message'
 *       401:
 *         description: 인증이 필요합니다
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       403:
 *         description: 접근 권한이 없습니다
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       404:
 *         description: 메시지를 찾을 수 없습니다
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
router.patch("/:id/read", authenticateJWT, async (req, res) => {
  try {
    if (!req.isAuthenticated?.()) {
      return res.status(401).json({ error: "로그인이 필요합니다" });
    }

    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "유효하지 않은 메시지 ID입니다" });
    }

    const message = await MessageModel.findById(id);
    if (!message) {
      return res.status(404).json({ error: "메시지를 찾을 수 없습니다" });
    }

    // 수신자만 읽음 표시 가능
    if (message.targetUserId.toString() !== req.user!._id!.toString()) {
      return res.status(403).json({ error: "메시지를 읽음으로 표시할 권한이 없습니다" });
    }

    const updatedMessage = await MessageModel.markAsRead(id);
    res.json(updatedMessage);
  } catch (error) {
    console.error("메시지 읽음 표시 오류:", error);
    res.status(500).json({ error: "메시지 읽음 표시 중 오류가 발생했습니다" });
  }
});

export default router;