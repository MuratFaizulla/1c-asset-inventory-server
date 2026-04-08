import { Router } from 'express'
import {
  getSessions,
  createSession,
  getSessionById,
  updateSession,
  deleteSession,
  getDeleteCode_,
  scanItem,
  updateItem,
  cancelItem,
  closeSession,
  reopenSession,
  getPending,
  getReturned,
  exportSession,
  exportPending,
  exportDamaged,
  getStatsByLocation,
  bulkAccept,
  cloneSession,
} from '../controllers/collectionController.js'

const router = Router()

router.get('/code', getDeleteCode_)
router.get('/',     getSessions)
router.post('/',    createSession)

router.post('/:id/scan',                 scanItem)
router.post('/:id/bulk-accept',          bulkAccept)
router.post('/:id/clone',                cloneSession)
router.patch('/:id/item/:itemId/cancel', cancelItem)
router.patch('/:id/item/:itemId',        updateItem)
router.patch('/:id/close',               closeSession)
router.patch('/:id/reopen',              reopenSession)
router.get('/:id/pending',               getPending)
router.get('/:id/returned',              getReturned)
router.get('/:id/stats/by-location',     getStatsByLocation)
router.get('/:id/export',                exportSession)
router.get('/:id/export-pending',        exportPending)
router.get('/:id/export-damaged',        exportDamaged)

// /:id всегда в конце
router.get('/:id',    getSessionById)
router.patch('/:id',  updateSession)
router.delete('/:id', deleteSession)

export default router
