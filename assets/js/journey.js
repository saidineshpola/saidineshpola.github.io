/*
 * Career graph: nodes are roles, edge length is proportional to the time spent
 * at the node it leaves. Clicking a node opens its topics and projects.
 */
(function (window, document) {
	'use strict';

	var SVG_NS = 'http://www.w3.org/2000/svg';

	function logo(domain) {
		return 'https://www.google.com/s2/favicons?domain=' + domain + '&sz=128';
	}

	// `months` is the time spent at the node; it drives the length of its outgoing edge.
	var JOURNEY = [
		{
			id: 'nitr',
			kind: 'edu',
			name: 'NIT Raipur',
			period: '2014 – 2018',
			short: '2014–18',
			months: 46,
			role: 'B.Tech, Electronics & Communication',
			place: 'Raipur, India',
			logo: logo('nitrr.ac.in'),
			tags: ['Data Structures', 'Signals', 'Embedded Systems'],
			notes: ['First contact with machine learning, and the math I still lean on.']
		},
		{
			id: 'iitg',
			kind: 'edu',
			name: 'IIT Guwahati',
			period: '2019 – 2021',
			short: '2019–21',
			months: 24,
			role: 'M.Tech, Electronics & Communication',
			place: 'Guwahati, India',
			logo: logo('iitg.ac.in'),
			tags: ['Information Theory', 'Source-Channel Coding', 'Deep Learning'],
			notes: [
				'Thesis: order-preserving interdependent source-channel coding for IoT, cutting bit overhead by 27% over SSCC.',
				'Published at IEEE GCON 2023.'
			]
		},
		{
			id: 'aicrowd',
			kind: 'work',
			branch: true,
			name: 'AICrowd',
			period: 'Jan – Apr 2021',
			short: 'Jan – Apr 2021',
			months: 3,
			role: 'Research Fellow, Computer Vision',
			place: 'Remote',
			logo: logo('aicrowd.com'),
			tags: ['Computer Vision', 'Research'],
			notes: ['Turned a biological challenge into a scalable CV pipeline deployed across African regions.']
		},
		{
			id: 'infosys',
			kind: 'work',
			name: 'Infosys',
			period: '2021 – 2025',
			short: '2021–25',
			months: 45,
			role: 'Specialist Programmer L3 (AI/ML)',
			place: 'Bengaluru, India',
			logo: logo('infosys.com'),
			tags: ['Multi-Agent Systems', 'RAG', 'Computer Vision', 'Evals'],
			notes: [
				'Multi-agent log analyzer for GE industrial systems, doing root-cause analysis on unstructured logs.',
				'Enterprise document retrieval and RAG, with frameworks to measure subjective relevance.',
				'R&D on OCR, object detection, image classification and segmentation.',
				'My hackathon years: podiums at NeurIPS, CVPR, Amazon and NVIDIA challenges.'
			]
		},
		{
			id: 'nextiva',
			kind: 'work',
			name: 'Nextiva',
			period: '2025 – Aug 2026',
			short: '2025–26',
			months: 15,
			role: 'AI Engineer',
			place: 'Bengaluru, India',
			logo: logo('nextiva.com'),
			tags: ['Agentic Search', 'LangGraph', 'LLM Evals'],
			notes: [
				'Agentic search for customer onboarding: web search plus reasoning over the customer domain.',
				'Ground-truth datasets and an automated eval framework that caught prompt regressions before production.'
			]
		},
		{
			id: 'flipkart',
			kind: 'work',
			current: true,
			name: 'Flipkart',
			period: 'Aug 2026 – present',
			short: '2026 –',
			months: 1,
			role: 'AI Engineer 2',
			place: 'Bengaluru, India',
			logo: logo('flipkart.com'),
			tags: ['Production AI', 'LLM Systems'],
			notes: ['Building AI features that hold up under real traffic.']
		},
		{
			id: 'research',
			kind: 'goal',
			name: 'Research',
			period: 'long term',
			short: 'long term',
			months: 0,
			role: 'Where I am headed',
			place: '',
			icon: '\uD83D\uDD2C',
			tags: ['Reasoning', 'Interpretability', 'RL'],
			notes: ['Production work today, with the aim of moving into a research role on reasoning, interpretability and RL.']
		}
	];

	var CFG = {
		nodeR: 26,
		branchR: 20,
		goalR: 24,
		padX: 16,
		minEdge: 50,
		maxEdge: 200,
		goalEdge: 66,
		spineY: 150,
		branchY: 52,
		height: 228,
		vPadTop: 20,
		vPerMonth: 1.5,
		vMinEdge: 48,
		vMaxEdge: 130,
		breakpoint: 620
	};

	var selectedId = 'flipkart';
	var lastWidth = 0;

	function byId(id) {
		for (var i = 0; i < JOURNEY.length; i++) {
			if (JOURNEY[i].id === id) return JOURNEY[i];
		}
		return null;
	}

	function radius(node) {
		if (node.kind === 'goal') return CFG.goalR;
		if (node.branch) return CFG.branchR;
		return CFG.nodeR;
	}

	function duration(months) {
		if (months < 24) return months + ' mo';
		return Math.round(months / 12) + ' yrs';
	}

	function svg(name, attrs) {
		var node = document.createElementNS(SVG_NS, name);
		for (var key in attrs) {
			if (Object.prototype.hasOwnProperty.call(attrs, key)) node.setAttribute(key, attrs[key]);
		}
		return node;
	}

	function el(tag, className, text) {
		var node = document.createElement(tag);
		if (className) node.className = className;
		if (text) node.textContent = text;
		return node;
	}

	/* Chain of nodes drawn on the spine. On narrow screens the concurrent
	   fellowship folds into the chain instead of hanging off it as a branch. */
	function chainFor(vertical) {
		var chain = [];
		for (var i = 0; i < JOURNEY.length; i++) {
			if (vertical || !JOURNEY[i].branch) chain.push(JOURNEY[i]);
		}
		return chain;
	}

	function edgesFor(chain) {
		var edges = [];
		for (var i = 0; i < chain.length - 1; i++) {
			var from = chain[i];
			var to = chain[i + 1];
			edges.push({
				from: from,
				to: to,
				fixed: to.kind === 'goal' ? CFG.goalEdge : 0,
				dashed: to.kind === 'goal' || !!to.branch,
				label: to.kind === 'goal' ? 'next' : duration(from.months)
			});
		}
		return edges;
	}

	function clamp(value, min, max) {
		return Math.min(Math.max(value, min), max);
	}

	function layout(width) {
		var vertical = width < CFG.breakpoint;
		var chain = chainFor(vertical);
		var edges = edgesFor(chain);
		var i;
		var diameters = 0;

		for (i = 0; i < chain.length; i++) diameters += radius(chain[i]) * 2;

		if (vertical) {
			for (i = 0; i < edges.length; i++) {
				edges[i].length = edges[i].fixed ||
					clamp(edges[i].from.months * CFG.vPerMonth, CFG.vMinEdge, CFG.vMaxEdge);
			}
		} else {
			var months = 0;
			var fixedPx = CFG.padX * 2 + diameters;
			for (i = 0; i < edges.length; i++) {
				if (edges[i].fixed) fixedPx += edges[i].fixed;
				else months += edges[i].from.months;
			}
			var perMonth = months > 0 ? Math.max(width - fixedPx, CFG.minEdge * 4) / months : 0;
			for (i = 0; i < edges.length; i++) {
				edges[i].length = edges[i].fixed ||
					clamp(edges[i].from.months * perMonth, CFG.minEdge, CFG.maxEdge);
			}
		}

		var cursor = vertical ? CFG.vPadTop : CFG.padX;
		for (i = 0; i < chain.length; i++) {
			var r = radius(chain[i]);
			cursor += r;
			chain[i].x = vertical ? CFG.padX + CFG.nodeR : cursor;
			chain[i].y = vertical ? cursor : CFG.spineY;
			cursor += r + (edges[i] ? edges[i].length : 0);
		}

		var branch = vertical ? null : byId('aicrowd');
		if (branch) {
			var anchor = byId('iitg');
			branch.x = anchor.x + 66;
			branch.y = CFG.branchY;
		}

		return {
			vertical: vertical,
			chain: chain,
			edges: edges,
			branch: branch,
			anchor: byId('iitg'),
			width: vertical ? width : Math.max(width, cursor + CFG.padX),
			height: vertical ? cursor + 32 : CFG.height
		};
	}

	function drawEdge(root, edge, vertical) {
		var fromR = radius(edge.from);
		var toR = radius(edge.to);
		var line = vertical
			? svg('line', { x1: edge.from.x, y1: edge.from.y + fromR, x2: edge.to.x, y2: edge.to.y - toR })
			: svg('line', { x1: edge.from.x + fromR, y1: edge.from.y, x2: edge.to.x - toR, y2: edge.to.y });
		line.setAttribute('class', 'jg-edge' + (edge.dashed ? ' jg-edge--soft' : ''));
		root.appendChild(line);

		var midX = vertical ? edge.from.x : (edge.from.x + fromR + edge.to.x - toR) / 2;
		var midY = vertical ? (edge.from.y + fromR + edge.to.y - toR) / 2 : edge.from.y;
		var halfW = 6 + edge.label.length * 3.4;
		root.appendChild(svg('rect', {
			'class': 'jg-chip-bg',
			x: midX - halfW,
			y: midY - 8,
			width: halfW * 2,
			height: 16,
			rx: 8
		}));
		var text = svg('text', { 'class': 'jg-chip', x: midX, y: midY, dy: '0.34em' });
		text.textContent = edge.label;
		root.appendChild(text);
	}

	function drawNode(root, defs, node, vertical) {
		var r = radius(node);
		var group = svg('g', {
			id: 'jg-node-' + node.id,
			'class': 'jg-node jg-node--' + node.kind + (node.id === selectedId ? ' is-active' : ''),
			tabindex: '0',
			role: 'button',
			'aria-label': node.name + ', ' + node.role
		});

		var title = svg('title');
		title.textContent = node.name + ' · ' + node.period;
		group.appendChild(title);

		if (node.current) {
			group.appendChild(svg('circle', { 'class': 'jg-pulse', cx: node.x, cy: node.y, r: r + 5 }));
		}

		group.appendChild(svg('circle', { 'class': 'jg-disc', cx: node.x, cy: node.y, r: r }));

		if (node.logo) {
			var clipId = 'jg-clip-' + node.id;
			var clip = svg('clipPath', { id: clipId });
			clip.appendChild(svg('circle', { cx: node.x, cy: node.y, r: r - 5 }));
			defs.appendChild(clip);

			var image = svg('image', {
				x: node.x - (r - 5),
				y: node.y - (r - 5),
				width: (r - 5) * 2,
				height: (r - 5) * 2,
				preserveAspectRatio: 'xMidYMid meet',
				'clip-path': 'url(#' + clipId + ')'
			});
			image.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', node.logo);
			image.setAttribute('href', node.logo);
			group.appendChild(image);
		} else if (node.icon) {
			var icon = svg('text', { 'class': 'jg-icon', x: node.x, y: node.y, dy: '0.36em' });
			icon.textContent = node.icon;
			group.appendChild(icon);
		}

		var labelX;
		var labelY;
		var anchor;
		if (vertical || node.branch) {
			labelX = node.x + r + 14;
			labelY = node.y - 1;
			anchor = 'start';
		} else {
			labelX = node.x;
			labelY = node.y + r + 20;
			anchor = 'middle';
		}

		var name = svg('text', { 'class': 'jg-name', x: labelX, y: labelY, 'text-anchor': anchor });
		name.textContent = node.name;
		group.appendChild(name);

		var period = svg('text', { 'class': 'jg-period', x: labelX, y: labelY + 15, 'text-anchor': anchor });
		period.textContent = node.short || node.period;
		group.appendChild(period);

		group.addEventListener('click', function () { select(node.id); });
		group.addEventListener('keydown', function (event) {
			if (event.key === 'Enter' || event.key === ' ') {
				event.preventDefault();
				select(node.id);
			}
		});

		root.appendChild(group);
	}

	function renderCard(node) {
		var card = document.getElementById('journeyCard');
		if (!card) return;
		card.innerHTML = '';

		var head = el('div', 'jg-card-head');
		if (node.logo) {
			var img = el('img', 'jg-card-logo');
			img.src = node.logo;
			img.alt = node.name + ' logo';
			head.appendChild(img);
		} else {
			head.appendChild(el('span', 'jg-card-logo jg-card-logo--icon', node.icon || ''));
		}

		var heading = el('div', 'jg-card-heading');
		var title = el('div', 'jg-card-title', node.name);
		if (node.current) title.appendChild(el('span', 'jg-badge', 'now'));
		if (node.kind === 'goal') title.appendChild(el('span', 'jg-badge jg-badge--goal', 'goal'));
		heading.appendChild(title);

		var meta = [node.role, node.place, node.period].filter(Boolean).join(' · ');
		heading.appendChild(el('div', 'jg-card-meta', meta));
		head.appendChild(heading);
		card.appendChild(head);

		var tags = el('div', 'jg-tags');
		for (var i = 0; i < node.tags.length; i++) tags.appendChild(el('span', 'jg-tag', node.tags[i]));
		card.appendChild(tags);

		var list = el('ul', 'jg-list');
		for (var j = 0; j < node.notes.length; j++) list.appendChild(el('li', null, node.notes[j]));
		card.appendChild(list);
	}

	function select(id) {
		selectedId = id;
		var nodes = document.querySelectorAll('#journeyGraph .jg-node');
		for (var i = 0; i < nodes.length; i++) nodes[i].classList.remove('is-active');
		var active = document.getElementById('jg-node-' + id);
		if (active) active.classList.add('is-active');
		renderCard(byId(id));
	}

	function render() {
		var host = document.getElementById('journeyGraph');
		if (!host) return;

		var width = host.clientWidth || lastWidth || 720;
		lastWidth = width;

		var plan = layout(width);
		host.innerHTML = '';

		var root = svg('svg', {
			viewBox: '0 0 ' + Math.round(plan.width) + ' ' + Math.round(plan.height),
			width: Math.round(plan.width),
			height: Math.round(plan.height),
			'class': 'jg-svg',
			role: 'group',
			'aria-label': 'Career graph'
		});
		var defs = svg('defs');
		root.appendChild(defs);

		var i;
		for (i = 0; i < plan.edges.length; i++) drawEdge(root, plan.edges[i], plan.vertical);

		if (plan.branch) {
			var anchor = plan.anchor;
			var path = 'M ' + anchor.x + ' ' + (anchor.y - CFG.nodeR) +
				' Q ' + anchor.x + ' ' + plan.branch.y +
				' ' + (plan.branch.x - CFG.branchR) + ' ' + plan.branch.y;
			root.appendChild(svg('path', { 'class': 'jg-edge jg-edge--soft', d: path, fill: 'none' }));
		}

		for (i = 0; i < plan.chain.length; i++) drawNode(root, defs, plan.chain[i], plan.vertical);
		if (plan.branch) drawNode(root, defs, plan.branch, plan.vertical);

		host.appendChild(root);
		renderCard(byId(selectedId));
	}

	var resizeTimer = null;
	window.addEventListener('resize', function () {
		var host = document.getElementById('journeyGraph');
		if (!host || !host.clientWidth) return;
		window.clearTimeout(resizeTimer);
		resizeTimer = window.setTimeout(render, 150);
	});

	window.JourneyGraph = { render: render };

	if (document.readyState !== 'loading') render();
	else document.addEventListener('DOMContentLoaded', render);
})(window, document);
