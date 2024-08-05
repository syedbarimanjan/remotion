import React, {createRef, useCallback, useRef, useState} from 'react';
import {AbsoluteFill, spring} from 'remotion';
import type {Trending} from './Comp';
import {CurrentCountry} from './CurrentCountry';
import {Temperature} from './Temperature';
import {TrendingRepos} from './TrendingRepos';
import styles from './player-styles.module.css';
import type {Location} from './types';

export const paddingAndMargin = 20;
const height = 360;
const width = 640;
export const cardHeight = (height - paddingAndMargin * 3) / 2;
export const cardWidth = (width - paddingAndMargin * 3) / 2;

type Position = {
	x: number;
	y: number;
};

const getPositionForIndex = (index: number): Position => {
	const x =
		index % 2 === 0 ? paddingAndMargin : cardWidth + paddingAndMargin * 2;
	const y = index < 2 ? paddingAndMargin : cardHeight + paddingAndMargin * 2;

	return {x, y};
};

const getInitialPositions = () => {
	return new Array(4).fill(true).map((_, i) => getPositionForIndex(i));
};

const getIndexFromPosition = (clientX: number, clientY: number) => {
	const left = clientX < cardWidth / 2 + paddingAndMargin;
	const top = clientY < cardHeight / 2 + paddingAndMargin;

	if (left && top) {
		return 0;
	}

	if (!left && top) {
		return 1;
	}

	if (left && !top) {
		return 2;
	}

	if (!left && !top) {
		return 3;
	}
};

const arePositionsEqual = (a: Position[], b: Position[]) => {
	return a.every((pos, i) => {
		return pos.x === b[i].x && pos.y === b[i].y;
	});
};

const Card: React.FC<{
	readonly index: number;
	readonly refsToUse: React.MutableRefObject<HTMLDivElement>[];
	readonly onUpdate: (newIndices: number[]) => void;
	readonly content: React.ReactNode;
	readonly positions: React.MutableRefObject<Position[]>;
	readonly shouldBePositions: React.MutableRefObject<Position[]>;
	readonly indices: number[];
	readonly theme: 'dark' | 'light';
}> = ({
	positions,
	shouldBePositions,
	index,
	refsToUse,
	onUpdate,
	content,
	indices,
	theme,
}) => {
	const refToUse = refsToUse[index];
	const stopPrevious = useRef<(() => void)[]>([]);

	// eslint-disable-next-line react-hooks/exhaustive-deps
	let newIndices = [...indices];

	const applyPositions = useCallback(
		(except: number | null) => {
			let stopped = false;
			stopPrevious.current.forEach((s) => {
				s();
			});
			stopPrevious.current.push(() => {
				stopped = true;
			});
			positions.current.forEach((_, i) => {
				const shouldBe = shouldBePositions.current[i];
				const ref = refsToUse[i].current;
				if (!ref) {
					return;
				}

				if (except === null) {
					ref.style.pointerEvents = 'none';
				}

				if (i === except) {
					ref.style.left = getPositionForIndex(i).x + 'px';
					ref.style.top = getPositionForIndex(i).y + 'px';
					return;
				}

				let animationI = 1;
				const duration = 20;

				const releasePositionX = positions.current[i].x;
				const releasePositionY = positions.current[i].y;

				const finishAnimation = () => {
					refsToUse.forEach((r) => {
						r.current.style.zIndex = '1';
						r.current.classList.remove(styles.active);
						r.current.classList.remove(styles.passive);
					});
					if (i === 0) {
						setTimeout(() => {
							onUpdate([...newIndices]);
						}, 200);
					}
				};

				if (
					releasePositionX === shouldBe.x &&
					releasePositionY === shouldBe.y &&
					animationI === duration &&
					except === null
				) {
					finishAnimation();
					return;
				}

				const update = () => {
					if (stopped) {
						return;
					}

					const progress = spring({
						fps: 60,
						frame: animationI,
						config: {
							damping: 200,
						},
						durationInFrames: duration,
						durationRestThreshold: 0.001,
					});
					const newX =
						progress * (shouldBe.x - releasePositionX) + releasePositionX;
					const newY =
						progress * (shouldBe.y - releasePositionY) + releasePositionY;
					ref.style.left = `${newX}px`;
					ref.style.top = `${newY}px`;
					positions.current[i] = {
						x: newX,
						y: newY,
					};
					animationI++;
					if (animationI === duration && except === null) {
						finishAnimation();

						return;
					}

					requestAnimationFrame(update);
				};

				update();
			});
		},
		[newIndices, onUpdate, positions, refsToUse, shouldBePositions],
	);

	const onPointerDown = useCallback(
		(e: React.PointerEvent<HTMLDivElement>) => {
			e.currentTarget.setPointerCapture(e.pointerId);
			const cardLeft = refToUse.current.offsetLeft;
			const cardTop = refToUse.current.offsetTop;
			const startX = e.clientX;
			const startY = e.clientY;

			if (e.button === 2) {
				return;
			}

			let translateX = 0;
			let translateY = 0;
			refToUse.current.classList.add(styles.active);
			refToUse.current.style.cursor = 'grabbing';

			const onMove = (evt: PointerEvent) => {
				refsToUse.forEach((r) => {
					if (r !== refToUse) {
						r.current.classList.add(styles.passive);
					}
				});
				const scale =
					refToUse.current.getBoundingClientRect().width / cardWidth;

				translateX = (evt.clientX - startX) * (1 / scale);
				translateY = (evt.clientY - startY) * (1 / scale);

				const position = getIndexFromPosition(
					cardLeft + translateX,
					cardTop + translateY,
				);

				if (position === index) {
					if (
						!arePositionsEqual(getInitialPositions(), shouldBePositions.current)
					) {
						shouldBePositions.current = getInitialPositions();
						applyPositions(index);
					}
				} else {
					const newPos = getInitialPositions();
					newPos[position] = getPositionForIndex(index);
					newPos[index] = getPositionForIndex(position);
					// eslint-disable-next-line react-hooks/exhaustive-deps
					newIndices = [...indices];
					const prevIndexPosition = newIndices[position];
					newIndices[position] = newIndices[index];
					newIndices[index] = prevIndexPosition;

					if (!arePositionsEqual(newPos, shouldBePositions.current)) {
						shouldBePositions.current = newPos;
						applyPositions(index);
					}
				}

				refToUse.current.style.transform = `translateX(${translateX}px) translateY(${translateY}px)`;
				refToUse.current.style.zIndex = '2';
			};

			refToUse.current.addEventListener(
				'pointerup',
				() => {
					positions.current[index] = {
						x: cardLeft + translateX,
						y: cardTop + translateY,
					};
					refToUse.current.style.left = `${cardLeft + translateX}px`;
					refToUse.current.style.top = `${cardTop + translateY}px`;
					refToUse.current.style.transform = `translateX(0px) translateY(0px)`;
					refToUse.current.style.cursor = 'grab';

					refToUse.current.removeEventListener('pointermove', onMove);
					applyPositions(null);
				},
				{once: true},
			);

			refToUse.current.addEventListener('pointermove', onMove);
		},
		[applyPositions, index, positions, refToUse, shouldBePositions],
	);

	const onPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
		e.currentTarget.releasePointerCapture(e.pointerId);
	}, []);

	const {x, y} = getPositionForIndex(index);
	const color = theme === 'light' ? ' #EAEAEA' : '#333';
	return (
		<div
			ref={refToUse}
			className={styles.card}
			onPointerDown={onPointerDown}
			onPointerUp={onPointerUp}
			style={{
				width: cardWidth,
				height: cardHeight,
				position: 'absolute',
				left: x,
				top: y,
				userSelect: 'none',
				border: `1px solid ${color}`,
				borderRadius: 13,
				overflow: 'hidden',
				cursor: 'grab',
			}}
		>
			<AbsoluteFill
				style={{
					backgroundColor: color,
				}}
				className={styles.content}
			>
				{content}
			</AbsoluteFill>
		</div>
	);
};

export const Cards: React.FC<{
	readonly onUpdate: (newIndices: number[]) => void;
	readonly indices: number[];
	readonly theme: 'dark' | 'light';
	readonly location: Location;
	readonly trending: Trending;
}> = ({onUpdate, indices, theme, location, trending}) => {
	const [refs] = useState(() => {
		return new Array(4).fill(true).map(() => {
			return createRef<HTMLDivElement>();
		});
	});

	const positions = useRef(getInitialPositions());
	const shouldBePositions = useRef(getInitialPositions());

	return (
		<AbsoluteFill>
			{new Array(4).fill(true).map((_, i) => {
				const index = indices[i];
				const content =
					index === 0 ? (
						<TrendingRepos trending={trending} theme={theme} />
					) : index === 1 ? (
						<Temperature city={location.city} theme={theme} />
					) : index === 2 ? (
						<CurrentCountry location={location} theme={theme} />
					) : (
						'🐹'
					);
				return (
					<Card
						// eslint-disable-next-line react/no-array-index-key
						key={i}
						onUpdate={onUpdate}
						refsToUse={refs}
						index={i}
						content={content}
						positions={positions}
						shouldBePositions={shouldBePositions}
						indices={indices}
						theme={theme}
					/>
				);
			})}
		</AbsoluteFill>
	);
};
