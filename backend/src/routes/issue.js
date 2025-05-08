const express = require('express');
const router = express.Router();
const {
  createIssue,
  getIssues,
  getIssue,
  updateIssue,
  deleteIssue,
  updateIssueStatus,
  upvoteIssue,
  getMyIssues,
  addComment,
  addReply,
  likeComment,
  likeReply
} = require('../controllers/issueController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Rotalar
router.route('/')
  .get(getIssues)
  .post(protect, createIssue);

router.route('/myissues')
  .get(protect, getMyIssues);

router.route('/:id')
  .get(getIssue)
  .put(protect, updateIssue)
  .delete(protect, deleteIssue);

router.route('/:id/status')
  .put(protect, authorize(['admin', 'municipal_worker']), updateIssueStatus);

router.route('/:id/upvote')
  .put(protect, upvoteIssue);

// Yorum route'ları
router.route('/:id/comments')
  .post(protect, addComment);

router.route('/:id/comments/:commentId/replies')
  .post(protect, addReply);

router.route('/:id/comments/:commentId/like')
  .put(protect, likeComment);

router.route('/:id/comments/replies/:replyId/like')
  .put(protect, likeReply);

module.exports = router;
