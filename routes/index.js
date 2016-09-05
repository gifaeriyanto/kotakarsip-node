'use strict';

var express = require('express');
var path = require('path');
var router = express.Router();
var bodyParser = require('body-parser');
var pagination = require('pagination');
var qString = require('querystring');
var crypto = require('crypto');
var moment = require('moment');
var fs = require('fs');
var app = express();

var connection = require('../config/db');
var variable = require('../extra/variable');
var Paging = require('../extra/paging');
var db = require('../config/query.js');
// Upload File By Multer
var multer = require('multer');
var storage_inbox = multer.diskStorage({
	destination: './public/uploads/inbox',
	filename: function (req, file, cb) {
		crypto.pseudoRandomBytes(16, function (err, raw) {
			if (err) return cb(err);

			cb(null, raw.toString('hex') + path.extname(file.originalname));
		});
	}
});

var upload_inbox = multer({storage: storage_inbox});

var storage_outbox = multer.diskStorage({
	destination: './public/uploads/outbox',
	filename: function (req, file, cb) {
		crypto.pseudoRandomBytes(16, function (err, raw) {
			if (err) return cb(err);

			cb(null, raw.toString('hex') + path.extname(file.originalname));
		});
	}
});
var upload_outbox = multer({storage: storage_outbox});

// Query DB

var data_rak = db.getRak().then(function (data) {
	return data;
});

var data_disposisi;
connection.query('SELECT * FROM app_master_disposition;', function (err, results) {
	data_disposisi = results;
});

var count_inbox;
connection.query('SELECT count(id) as count FROM view_inbox;', function (err, results) {
	if (err) {
		return;
	}
	count_inbox = results[0].count;
});

var count_outbox;
connection.query('SELECT count(id) as count FROM view_outbox;', function (err, results) {
	count_outbox = results[0].count;
});

router.get('/surat-masuk/list', function (req, res, next) {

	// Pagination
	var pageActive = 1;
	if ( req.param('page') > 1 ) {
		pageActive = req.param('page');
	}

	var paginator = new pagination.SearchPaginator({prelink:req.path, current: pageActive, rowsPerPage: variable.page.limit, totalResult: count_inbox});
	paginator.getPaginationData();

	var start = paginator._result.current * variable.page.limit - variable.page.limit;
	var end = variable.page.limit;

	// Path
	var currentPage = req.path;

	connection.query('SELECT * FROM view_inbox LIMIT ' + start + ',' + end, function (err, rows, field) {
		if (err) throw err;

		res.render('./surat-masuk/index-list', {
			title : 'Surat Masuk',
			path : variable.nav,
			currentPage : path.dirname(currentPage),
			menuActive : '/surat-masuk',
			data : rows,
			data_rak : data_rak,
			pages : paginator._result.range,
			pageActive : paginator._result.current
		})
	})
})

router
	.get('/surat-masuk/tambah', function (req, res, next) {
		res.render('./surat-masuk/tambah', {
			title : 'Tambah Surat Masuk Baru',
			path : variable.nav,
			menuActive : '/surat-masuk',
			data_disposisi : data_disposisi,
			data_rak : data_rak
		})
	})
	.post('/surat-masuk/tambah', upload_inbox.single('inbox_file'), function(req, res) {
		var post = {
			id_user : req.body.id_user,
			id_rack : req.body.id_rack,
			inbox_date : req.body.inbox_date,
			inbox_from : req.body.inbox_from,
			inbox_number : req.body.inbox_number,
			inbox_title : req.body.inbox_title,
			inbox_desc : req.body.inbox_desc,
			inbox_disposition : req.body.inbox_disposition.toString(),
			inbox_file : req.file.filename
		}

		connection.query('INSERT INTO app_inbox SET ?', post, function(err, result) {
			if (err) throw err;

			res.redirect('/surat-masuk/tambah');
		});

	});

router
	.get('/surat-masuk/sunting/:id', function (req, res, next) {
		connection.query('SELECT * FROM view_inbox WHERE id = ' + req.params.id, function (err, rows, field) {
			var dis = '['+rows[0].inbox_disposition+']';
			res.render('./surat-masuk/sunting', {
				title : 'Sunting Surat Masuk #' + req.params.id,
				path : variable.nav,
				menuActive : '/surat-masuk',
				id : req.params.id,
				id_user : rows[0].id_user,
				id_rack : rows[0].id_rack,
				inbox_date : rows[0].inbox_date,
				inbox_from : rows[0].inbox_from,
				inbox_number : rows[0].inbox_number,
				inbox_title : rows[0].inbox_title,
				inbox_desc : rows[0].inbox_desc,
				inbox_disposition : JSON.parse(dis),
				data_disposisi : data_disposisi,
				date : moment(rows[0].inbox_date).format('YYYY-MM-DD'),
				data_rak : data_rak
			})

		})
	})
	.post('/surat-masuk/sunting/:id', upload_inbox.single('inbox_file'), function(req, res) {
		var post = {
			id : req.params.id,
			id_user : req.body.id_user,
			id_rack : req.body.id_rack,
			inbox_date : req.body.inbox_date,
			inbox_from : req.body.inbox_from,
			inbox_number : req.body.inbox_number,
			inbox_title : req.body.inbox_title,
			inbox_desc : req.body.inbox_desc,
			inbox_disposition : req.body.inbox_disposition.toString(),
			// inbox_file : req.body.inbox_file
		}

		connection.query('UPDATE app_inbox SET id_user = ?, id_rack = ?, inbox_date = ?, inbox_from = ?, inbox_number = ?, inbox_title = ?, inbox_desc = ?, inbox_disposition = ? WHERE id = ?', [post.id_user, post.id_rack, post.inbox_date, post.inbox_from, post.inbox_number, post.inbox_title, post.inbox_desc, post.inbox_disposition, post.id], function(err, result) {
			if (err) throw err;

			res.redirect('/surat-masuk/sunting/' + post.id)
		});

	});



router.get('/surat-masuk/detail/:id', function (req, res, next) {
	connection.query('SELECT * FROM view_inbox WHERE id = ' + req.params.id, function (err, rows, field) {
		if (err) throw err;

		var dis = '['+rows[0].inbox_disposition+']';
		res.render('./surat-masuk/detail', {
			title : 'Detail Surat Masuk #' + req.params.id,
			path : variable.nav,
			menuActive : '/surat-masuk',
			id : req.params.id,
			data : rows,
			data_rak : data_rak,
			inbox_disposition : JSON.parse(dis),
			data_disposisi : data_disposisi,
			date : moment(rows[0].inbox_date).format('DD-MM-YYYY')
		})
	})
})



router.get('/surat-masuk/cetak', function (req, res, next) {
	connection.query('SELECT * FROM view_inbox ORDER BY id', function (err, rows, field) {
		if (err) throw err;

		res.render('./surat-masuk/cetak', {
			title : 'Cetak Surat Masuk',
			data : rows,
			data_rak : data_rak,
			date : function (i) {
				return moment(rows[i].inbox_date).format('DD-MM-YYYY')
			},
			inbox_disposition : function (i) {
				var dis = '['+rows[i].inbox_disposition+']';
				return JSON.parse(dis);
			},
			data_disposisi : data_disposisi
		})
	})
})



router.get('/surat-masuk/hapus/:id', function (req, res, next) {
	connection.query('DELETE FROM app_inbox WHERE id=' + req.params.id, function (err, rows, field) {
		if (err) throw err;

		res.redirect('/surat-masuk');
	})
})




// Get Surat Keluar Page
router.get('/surat-keluar', function(req, res, next) {

	// Pagination
	var pageActive = 1;
	if ( req.param('page') > 1 ) {
		pageActive = req.param('page');
	}

	var paginator = new pagination.SearchPaginator({prelink:req.path, current: pageActive, rowsPerPage: variable.page.limit, totalResult: count_outbox});
	paginator.getPaginationData();

	var start = paginator._result.current * variable.page.limit - variable.page.limit;
	var end = variable.page.limit;

	// Path
	var currentPage = req.path;
	
	connection.query('SELECT * FROM view_outbox LIMIT ' + start + ',' + end, function (err, rows, field) {
		if (err) throw err;

		res.render('./surat-keluar/index', {
			title : 'Surat Keluar',
			path : variable.nav,
			currentPage : currentPage,
			menuActive : '/surat-keluar',
			data : rows,
			data_rak : data_rak,
			pages : paginator._result.range,
			pageActive : paginator._result.current
		})
	})
});



router.get('/surat-keluar/list', function (req, res, next) {

	// Pagination
	var pageActive = 1;
	if ( req.param('page') > 1 ) {
		pageActive = req.param('page');
	}

	var paginator = new pagination.SearchPaginator({prelink:req.path, current: pageActive, rowsPerPage: variable.page.limit, totalResult: count_inbox});
	paginator.getPaginationData();

	var start = paginator._result.current * variable.page.limit - variable.page.limit;
	var end = variable.page.limit;

	// Path
	var currentPage = req.path;

	connection.query('SELECT * FROM view_outbox LIMIT ' + start + ',' + end, function (err, rows, field) {
		if (err) throw err;

		res.render('./surat-keluar/index-list', {
			title : 'Surat keluar',
			path : variable.nav,
			currentPage : path.dirname(currentPage),
			menuActive : '/surat-keluar',
			data : rows,
			data_rak : data_rak,
			pages : paginator._result.range,
			pageActive : paginator._result.current
		})
	})
})



router
	.get('/surat-keluar/tambah', function (req, res, next) {
		res.render('./surat-keluar/tambah', {
			title : 'Tambah Surat keluar Baru',
			path : variable.nav,
			menuActive : '/surat-keluar',
			data_rak : data_rak
		})
	})
	.post('/surat-keluar/tambah', upload_outbox.single('outbox_file'), function(req, res) {
		var post = {
			id_user : req.body.id_user,
			id_rack : req.body.id_rack,
			outbox_date : req.body.outbox_date,
			outbox_for : req.body.outbox_for,
			outbox_number : req.body.outbox_number,
			outbox_title : req.body.outbox_title,
			outbox_desc : req.body.outbox_desc,
			outbox_file : req.file.filename
		}

		connection.query('INSERT INTO app_outbox SET ?', post, function(err, result) {
			if (err) throw err;

			res.redirect('/surat-keluar/tambah');
		});

	});



router
	.get('/surat-keluar/sunting/:id', function (req, res, next) {
		connection.query('SELECT * FROM view_outbox WHERE id = ' + req.params.id, function (err, rows, field) {
			res.render('./surat-keluar/sunting', {
				title : 'Sunting Surat keluar #' + req.params.id,
				path : variable.nav,
				menuActive : '/surat-keluar',
				id : req.params.id,
				id_user : rows[0].id_user,
				id_rack : rows[0].id_rack,
				outbox_date : rows[0].outbox_date,
				outbox_for : rows[0].outbox_for,
				outbox_number : rows[0].outbox_number,
				outbox_title : rows[0].outbox_title,
				outbox_desc : rows[0].outbox_desc,
				date : moment(rows[0].outbox_date).format('YYYY-MM-DD'),
				data_rak : data_rak
			})

		})
	})
	.post('/surat-keluar/sunting/:id', upload_outbox.single('outbox_file'), function(req, res) {
		var post = {
			id : req.params.id,
			id_user : req.body.id_user,
			id_rack : req.body.id_rack,
			outbox_date : req.body.outbox_date,
			outbox_for : req.body.outbox_for,
			outbox_number : req.body.outbox_number,
			outbox_title : req.body.outbox_title,
			outbox_desc : req.body.outbox_desc
			// outbox_file : req.body.outbox_file
		}

		connection.query('UPDATE app_outbox SET id_user = ?, id_rack = ?, outbox_date = ?, outbox_for = ?, outbox_number = ?, outbox_title = ?, outbox_desc = ? WHERE id = ?', [post.id_user, post.id_rack, post.outbox_date, post.outbox_for, post.outbox_number, post.outbox_title, post.outbox_desc, post.id], function(err, result) {
			if (err) throw err;

			res.redirect('/surat-keluar/sunting/' + post.id)
		});

	});



router.get('/surat-keluar/detail/:id', function (req, res, next) {
	connection.query('SELECT * FROM view_outbox WHERE id = ' + req.params.id, function (err, rows, field) {
		if (err) throw err;

		res.render('./surat-keluar/detail', {
			title : 'Detail Surat keluar #' + req.params.id,
			path : variable.nav,
			menuActive : '/surat-keluar',
			id : req.params.id,
			data : rows,
			data_rak : data_rak,
			date : moment(rows[0].outbox_date).format('DD-MM-YYYY')
		})
	})
})



router.get('/surat-keluar/cetak', function (req, res, next) {
	connection.query('SELECT * FROM view_outbox ORDER BY id', function (err, rows, field) {
		if (err) throw err;

		res.render('./surat-keluar/cetak', {
			title : 'Cetak Surat keluar',
			data : rows,
			data_rak : data_rak,
			date : function (i) {
				return moment(rows[i].outbox_date).format('DD-MM-YYYY')
			}
		})
	})
})



router.get('/surat-keluar/hapus/:id', function (req, res, next) {
	connection.query('DELETE FROM app_outbox WHERE id=' + req.params.id, function (err, rows, field) {
		if (err) throw err;

		res.redirect('/surat-keluar');
	})
})

module.exports = router;