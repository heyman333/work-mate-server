import express from "express";
import { WorkPlaceModel } from "../models/WorkPlace";
import { authenticateJWT } from "../middleware/auth";

/**
 * @swagger
 * tags:
 *   name: WorkPlace
 *   description: Work place management endpoints
 */

const router = express.Router();

/**
 * @swagger
 * /workplace:
 *   post:
 *     summary: Create a new work place
 *     tags: [WorkPlace]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Name of the work place
 *               latitude:
 *                 type: number
 *                 description: Latitude of the work place
 *               longitude:
 *                 type: number
 *                 description: Longitude of the work place
 *               description:
 *                 type: string
 *                 description: Description of work being done at this place
 *             required:
 *               - name
 *               - latitude
 *               - longitude
 *     responses:
 *       201:
 *         description: Work place created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 workPlace:
 *                   $ref: '#/components/schemas/WorkPlace'
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/", authenticateJWT, async (req, res) => {
  const { name, latitude, longitude, description } = req.body;
  const userId = req.user?._id?.toString();

  if (!name || latitude === undefined || longitude === undefined) {
    return res.status(400).json({ error: "이름, 위도, 경도는 필수입니다." });
  }

  if (!userId) {
    return res.status(401).json({ error: "인증되지 않은 사용자입니다." });
  }

  try {
    const workPlace = await WorkPlaceModel.create({
      userId,
      name,
      latitude,
      longitude,
      description,
    });

    return res.status(201).json({
      message: "작업 장소가 성공적으로 생성되었습니다.",
      workPlace: {
        id: workPlace._id,
        name: workPlace.name,
        latitude: workPlace.latitude,
        longitude: workPlace.longitude,
        description: workPlace.description,
        createdAt: workPlace.createdAt,
        updatedAt: workPlace.updatedAt,
      },
    });
  } catch (error) {
    console.error("작업 장소 생성 오류:", error);
    return res
      .status(500)
      .json({ error: "작업 장소 생성 중 오류가 발생했습니다." });
  }
});

/**
 * @swagger
 * /workplace/{id}:
 *   delete:
 *     summary: Delete a work place
 *     tags: [WorkPlace]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Work place ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Work place deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Work place not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete("/:id", authenticateJWT, async (req, res) => {
  const { id } = req.params;
  const userId = req.user?._id?.toString();

  if (!userId) {
    return res.status(401).json({ error: "인증되지 않은 사용자입니다." });
  }

  try {
    const workPlace = await WorkPlaceModel.findById(id);

    if (!workPlace) {
      return res.status(404).json({ error: "작업 장소를 찾을 수 없습니다." });
    }

    if (workPlace.userId.toString() !== userId) {
      return res
        .status(403)
        .json({ error: "작업 장소를 삭제할 권한이 없습니다." });
    }

    const deleted = await WorkPlaceModel.delete(id);

    if (deleted) {
      return res.json({ message: "작업 장소가 성공적으로 삭제되었습니다." });
    } else {
      return res.status(404).json({ error: "작업 장소를 찾을 수 없습니다." });
    }
  } catch (error) {
    console.error("작업 장소 삭제 오류:", error);
    return res
      .status(500)
      .json({ error: "작업 장소 삭제 중 오류가 발생했습니다." });
  }
});

/**
 * @swagger
 * /workplace:
 *   get:
 *     summary: Get user's work places
 *     tags: [WorkPlace]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: User's work places
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 workPlaces:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/WorkPlace'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/", authenticateJWT, async (req, res) => {
  const userId = req.user?._id?.toString();

  if (!userId) {
    return res.status(401).json({ error: "인증되지 않은 사용자입니다." });
  }

  try {
    const workPlaces = await WorkPlaceModel.findByUserId(userId);

    return res.json({
      workPlaces: workPlaces.map((wp) => ({
        id: wp._id,
        name: wp.name,
        latitude: wp.latitude,
        longitude: wp.longitude,
        description: wp.description,
        createdAt: wp.createdAt,
        updatedAt: wp.updatedAt,
      })),
    });
  } catch (error) {
    console.error("작업 장소 조회 오류:", error);
    return res
      .status(500)
      .json({ error: "작업 장소 조회 중 오류가 발생했습니다." });
  }
});

/**
 * @swagger
 * /workplace/all:
 *   get:
 *     summary: Get all work places with creator information
 *     tags: [WorkPlace]
 *     responses:
 *       200:
 *         description: All work places with creator information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 workPlaces:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       latitude:
 *                         type: number
 *                       longitude:
 *                         type: number
 *                       description:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                       creator:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           email:
 *                             type: string
 *                           profileImage:
 *                             type: string
 *                           githubId:
 *                             type: string
 *                           googleId:
 *                             type: string
 *                           skillSet:
 *                             type: string
 *                           githubUrl:
 *                             type: string
 *                           linkedinUrl:
 *                             type: string
 *                           company:
 *                             type: string
 *                           mbti:
 *                             type: string
 *                           collaborationGoal:
 *                             type: string
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                           updatedAt:
 *                             type: string
 *                             format: date-time
 *                           lastLoginAt:
 *                             type: string
 *                             format: date-time
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/all", async (req, res) => {
  try {
    const workPlaces = await WorkPlaceModel.findAllWithCreators();

    return res.json({
      workPlaces: workPlaces.map((wp) => ({
        id: wp._id,
        name: wp.name,
        latitude: wp.latitude,
        longitude: wp.longitude,
        description: wp.description,
        createdAt: wp.createdAt,
        updatedAt: wp.updatedAt,
        creator: {
          id: wp.creator._id,
          name: wp.creator.name,
          email: wp.creator.email,
          profileImage: wp.creator.profileImage,
          githubId: wp.creator.githubId,
          googleId: wp.creator.googleId,
          skillSet: wp.creator.skillSet,
          githubUrl: wp.creator.githubUrl,
          linkedinUrl: wp.creator.linkedinUrl,
          company: wp.creator.company,
          mbti: wp.creator.mbti,
          collaborationGoal: wp.creator.collaborationGoal,
          createdAt: wp.creator.createdAt,
          updatedAt: wp.creator.updatedAt,
          lastLoginAt: wp.creator.lastLoginAt,
        },
      })),
    });
  } catch (error) {
    console.error("모든 작업 장소 조회 오류:", error);
    return res
      .status(500)
      .json({ error: "모든 작업 장소 조회 중 오류가 발생했습니다." });
  }
});

export default router;
