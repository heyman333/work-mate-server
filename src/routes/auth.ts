import express from "express";
import jwt from "jsonwebtoken";
import axios from "axios";
import { UserModel } from "../models/User";
import { LikeModel } from "../models/Like";
import { ObjectId } from "mongodb";

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication endpoints
 */

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

const generateToken = (userId: string): string => {
  const payload = {
    userId,
    iat: Date.now(),
  };

  const expiresIn = "24h";

  return jwt.sign(payload, JWT_SECRET, { expiresIn });
};

const setCookieWithToken = (res: express.Response, userId: string): void => {
  const token = generateToken(userId);

  res.cookie("auth_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 24 * 60 * 60 * 1000,
  });
};

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Successfully logged out
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.post("/logout", (req, res) => {
  res.clearCookie("auth_token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  });
  res.json({ message: "로그아웃되었습니다." });
});

/**
 * @swagger
 * /auth/join:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserJoinRequest'
 *     responses:
 *       200:
 *         description: User successfully registered
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: User already exists
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
router.post("/join", async (req, res) => {
  const { email, name, profileImage, githubId, googleId, skillSet, githubUrl, linkedinUrl, company, mbti, collaborationGoal } = req.body;

  if (!email || !name) {
    return res.status(400).json({ error: "이메일과 이름은 필수입니다." });
  }

  if (collaborationGoal && collaborationGoal.length > 1000) {
    return res.status(400).json({ error: "협업 목표는 최대 1000자까지 입력 가능합니다." });
  }

  try {
    const existingUser = await UserModel.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: "이미 가입된 이메일입니다." });
    }

    const newUser = await UserModel.create({
      email,
      name,
      profileImage,
      githubId,
      googleId,
      skillSet,
      githubUrl,
      linkedinUrl,
      company,
      mbti,
      collaborationGoal,
    });

    setCookieWithToken(res, newUser._id?.toString() || "");

    return res.json({
      message: "회원가입 성공",
      user: {
        id: newUser._id,
        email: newUser.email,
        name: newUser.name,
        profileImage: newUser.profileImage,
        githubId: newUser.githubId,
        googleId: newUser.googleId,
        skillSet: newUser.skillSet,
        githubUrl: newUser.githubUrl,
        linkedinUrl: newUser.linkedinUrl,
        company: newUser.company,
        mbti: newUser.mbti,
        collaborationGoal: newUser.collaborationGoal,
      },
    });
  } catch (error) {
    console.error("회원가입 오류:", error);
    return res.status(500).json({ error: "회원가입 중 오류가 발생했습니다." });
  }
});

/**
 * @swagger
 * /auth/check:
 *   post:
 *     summary: Check if user exists and login
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserCheckRequest'
 *     responses:
 *       200:
 *         description: User check result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 exists:
 *                   type: boolean
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Invalid input
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
router.post("/check", async (req, res) => {
  const { email, githubId, googleId } = req.body;

  if (!email && !githubId && !googleId) {
    return res
      .status(400)
      .json({ error: "이메일, githubId, googleId 중 하나는 필수입니다." });
  }

  try {
    let existingUser = null;

    if (email) {
      existingUser = await UserModel.findByEmail(email);
    }

    if (!existingUser && githubId) {
      existingUser = await UserModel.findByGithubId(githubId);
    }

    if (!existingUser && googleId) {
      existingUser = await UserModel.findByGoogleId(googleId);
    }

    if (existingUser) {
      setCookieWithToken(res, existingUser._id?.toString() || "");

      return res.json({
        exists: true,
        user: {
          id: existingUser._id,
          email: existingUser.email,
          name: existingUser.name,
          profileImage: existingUser.profileImage,
        },
      });
    } else {
      return res.json({ exists: false });
    }
  } catch (error) {
    console.error("사용자 확인 오류:", error);
    return res
      .status(500)
      .json({ error: "사용자 확인 중 오류가 발생했습니다." });
  }
});

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current user information
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Current user information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/me", (req, res) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    res.json({ user: req.user });
  } else {
    res.status(401).json({ error: "인증되지 않은 사용자입니다." });
  }
});

/**
 * @swagger
 * /auth/github/callback:
 *   post:
 *     summary: Handle GitHub OAuth callback
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code:
 *                 type: string
 *                 description: Authorization code from GitHub
 *             required:
 *               - code
 *     responses:
 *       200:
 *         description: GitHub OAuth success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 access_token:
 *                   type: string
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: number
 *                     login:
 *                       type: string
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *                     avatar_url:
 *                       type: string
 *       400:
 *         description: Invalid code or missing parameters
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
/**
 * @swagger
 * /auth/update:
 *   put:
 *     summary: Update user information
 *     tags: [Auth]
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
 *                 description: User name
 *               profileImage:
 *                 type: string
 *                 description: User profile image URL
 *               skillSet:
 *                 type: string
 *                 description: User's skill set
 *               githubUrl:
 *                 type: string
 *                 description: GitHub profile URL
 *               linkedinUrl:
 *                 type: string
 *                 description: LinkedIn profile URL
 *               company:
 *                 type: string
 *                 description: User's company/organization
 *               mbti:
 *                 type: string
 *                 description: User's MBTI type
 *               collaborationGoal:
 *                 type: string
 *                 description: User's collaboration goal (max 1000 characters)
 *                 maxLength: 1000
 *     responses:
 *       200:
 *         description: User information updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
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
 *       404:
 *         description: User not found
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
router.put("/update", async (req, res) => {
  const { name, profileImage, skillSet, githubUrl, linkedinUrl, company, mbti, collaborationGoal } = req.body;

  if (!req.user || !req.user._id) {
    return res.status(401).json({ error: "인증되지 않은 사용자입니다." });
  }

  if (collaborationGoal && collaborationGoal.length > 1000) {
    return res.status(400).json({ error: "협업 목표는 최대 1000자까지 입력 가능합니다." });
  }

  try {
    const updateData: any = {};
    
    if (name !== undefined) updateData.name = name;
    if (profileImage !== undefined) updateData.profileImage = profileImage;
    if (skillSet !== undefined) updateData.skillSet = skillSet;
    if (githubUrl !== undefined) updateData.githubUrl = githubUrl;
    if (linkedinUrl !== undefined) updateData.linkedinUrl = linkedinUrl;
    if (company !== undefined) updateData.company = company;
    if (mbti !== undefined) updateData.mbti = mbti;
    if (collaborationGoal !== undefined) updateData.collaborationGoal = collaborationGoal;

    const updatedUser = await UserModel.update(req.user._id, updateData);
    
    if (!updatedUser) {
      return res.status(404).json({ error: "사용자를 찾을 수 없습니다." });
    }

    return res.json({
      message: "사용자 정보가 업데이트되었습니다.",
      user: {
        id: updatedUser._id,
        email: updatedUser.email,
        name: updatedUser.name,
        profileImage: updatedUser.profileImage,
        githubId: updatedUser.githubId,
        googleId: updatedUser.googleId,
        skillSet: updatedUser.skillSet,
        githubUrl: updatedUser.githubUrl,
        linkedinUrl: updatedUser.linkedinUrl,
        company: updatedUser.company,
        mbti: updatedUser.mbti,
        collaborationGoal: updatedUser.collaborationGoal,
      },
    });
  } catch (error) {
    console.error("사용자 정보 업데이트 오류:", error);
    return res.status(500).json({ error: "사용자 정보 업데이트 중 오류가 발생했습니다." });
  }
});

router.post("/github/callback", async (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: "Authorization code is required" });
  }

  try {
    const tokenResponse = await axios.post(
      "https://github.com/login/oauth/access_token",
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code: code,
      },
      {
        headers: {
          Accept: "application/json",
        },
      }
    );

    const { access_token } = tokenResponse.data;

    if (!access_token) {
      return res.status(400).json({ error: "Failed to get access token" });
    }

    console.log("access_token", access_token);

    const [userResponse, emailsResponse] = await Promise.all([
      axios.get("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }),
      axios
        .get("https://api.github.com/user/emails", {
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        })
        .catch((error) => {
          console.log(
            "Failed to fetch emails:",
            error.response?.status,
            error.response?.data
          );
          return { data: [] };
        }),
    ]);

    const primaryEmail = emailsResponse.data.find(
      (email: any) => email.primary
    );

    res.json({
      access_token,
      user: {
        ...userResponse.data,
        email: primaryEmail?.email ?? "",
      },
    });
  } catch (error) {
    console.error("GitHub OAuth error:", error);
    return res.status(500).json({ error: "GitHub OAuth failed" });
  }
});

/**
 * @swagger
 * /auth/delete:
 *   delete:
 *     summary: Delete user account (회원탈퇴)
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: User account successfully deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "회원탈퇴가 완료되었습니다."
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: User not found
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
router.delete("/delete", async (req, res) => {
  if (!req.user || !req.user._id) {
    return res.status(401).json({ error: "인증되지 않은 사용자입니다." });
  }

  try {
    const deleted = await UserModel.delete(req.user._id);
    
    if (!deleted) {
      return res.status(404).json({ error: "사용자를 찾을 수 없습니다." });
    }

    // Clear the auth cookie
    res.clearCookie("auth_token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    });

    return res.json({
      message: "회원탈퇴가 완료되었습니다.",
    });
  } catch (error) {
    console.error("회원탈퇴 오류:", error);
    return res.status(500).json({ error: "회원탈퇴 중 오류가 발생했습니다." });
  }
});

/**
 * @swagger
 * /auth/like/{targetUserId}:
 *   post:
 *     summary: Like a user
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: targetUserId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the user to like
 *     responses:
 *       200:
 *         description: User liked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "사용자를 좋아요했습니다."
 *       400:
 *         description: Cannot like yourself or invalid user ID
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
 *       404:
 *         description: Target user not found
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
router.post("/like/:targetUserId", async (req, res) => {
  if (!req.user || !req.user._id) {
    return res.status(401).json({ error: "인증되지 않은 사용자입니다." });
  }

  const { targetUserId } = req.params;

  if (!targetUserId) {
    return res.status(400).json({ error: "대상 사용자 ID가 필요합니다." });
  }

  if (req.user._id.toString() === targetUserId) {
    return res.status(400).json({ error: "자신을 좋아요할 수 없습니다." });
  }

  try {
    const targetUser = await UserModel.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ error: "대상 사용자를 찾을 수 없습니다." });
    }

    const fromUserId = new ObjectId(req.user._id);
    const toUserId = new ObjectId(targetUserId);

    const isAlreadyLiked = await LikeModel.exists(fromUserId, toUserId);
    if (isAlreadyLiked) {
      return res.status(400).json({ error: "이미 좋아요한 사용자입니다." });
    }

    const like = await LikeModel.create({ fromUserId, toUserId });
    if (!like) {
      return res.status(500).json({ error: "좋아요 추가 중 오류가 발생했습니다." });
    }

    return res.json({
      message: "사용자를 좋아요했습니다.",
    });
  } catch (error) {
    console.error("좋아요 추가 오류:", error);
    return res.status(500).json({ error: "좋아요 추가 중 오류가 발생했습니다." });
  }
});

/**
 * @swagger
 * /auth/unlike/{targetUserId}:
 *   delete:
 *     summary: Unlike a user
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: targetUserId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the user to unlike
 *     responses:
 *       200:
 *         description: User unliked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "좋아요를 취소했습니다."
 *       400:
 *         description: Invalid user ID or not liked
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
 *       404:
 *         description: Target user not found
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
router.delete("/unlike/:targetUserId", async (req, res) => {
  if (!req.user || !req.user._id) {
    return res.status(401).json({ error: "인증되지 않은 사용자입니다." });
  }

  const { targetUserId } = req.params;

  if (!targetUserId) {
    return res.status(400).json({ error: "대상 사용자 ID가 필요합니다." });
  }

  try {
    const targetUser = await UserModel.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ error: "대상 사용자를 찾을 수 없습니다." });
    }

    const fromUserId = new ObjectId(req.user._id);
    const toUserId = new ObjectId(targetUserId);

    const isLiked = await LikeModel.exists(fromUserId, toUserId);
    if (!isLiked) {
      return res.status(400).json({ error: "좋아요하지 않은 사용자입니다." });
    }

    const success = await LikeModel.delete(fromUserId, toUserId);
    if (!success) {
      return res.status(500).json({ error: "좋아요 취소 중 오류가 발생했습니다." });
    }

    return res.json({
      message: "좋아요를 취소했습니다.",
    });
  } catch (error) {
    console.error("좋아요 취소 오류:", error);
    return res.status(500).json({ error: "좋아요 취소 중 오류가 발생했습니다." });
  }
});

/**
 * @swagger
 * /auth/liked-users:
 *   get:
 *     summary: Get list of users I liked
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of liked users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
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
router.get("/liked-users", async (req, res) => {
  if (!req.user || !req.user._id) {
    return res.status(401).json({ error: "인증되지 않은 사용자입니다." });
  }

  try {
    const userId = new ObjectId(req.user._id);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const likedUsers = await LikeModel.getLikedUsers(userId, limit, skip);
    
    return res.json({
      users: likedUsers.map(item => ({
        ...item.user,
        id: item.user._id,
        likedAt: item.likedAt,
      })),
      pagination: {
        page,
        limit,
        hasMore: likedUsers.length === limit,
      },
    });
  } catch (error) {
    console.error("좋아요한 사용자 목록 조회 오류:", error);
    return res.status(500).json({ error: "좋아요한 사용자 목록 조회 중 오류가 발생했습니다." });
  }
});

/**
 * @swagger
 * /auth/liked-by-users:
 *   get:
 *     summary: Get list of users who liked me
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of users who liked me
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
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
router.get("/liked-by-users", async (req, res) => {
  if (!req.user || !req.user._id) {
    return res.status(401).json({ error: "인증되지 않은 사용자입니다." });
  }

  try {
    const userId = new ObjectId(req.user._id);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const likedByUsers = await LikeModel.getLikedByUsers(userId, limit, skip);
    
    return res.json({
      users: likedByUsers.map(item => ({
        ...item.user,
        id: item.user._id,
        likedAt: item.likedAt,
      })),
      pagination: {
        page,
        limit,
        hasMore: likedByUsers.length === limit,
      },
    });
  } catch (error) {
    console.error("나를 좋아요한 사용자 목록 조회 오류:", error);
    return res.status(500).json({ error: "나를 좋아요한 사용자 목록 조회 중 오류가 발생했습니다." });
  }
});

export default router;
