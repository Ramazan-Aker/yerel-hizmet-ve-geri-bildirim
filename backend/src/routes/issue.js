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
  getMyIssues
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

module.exports = router;
