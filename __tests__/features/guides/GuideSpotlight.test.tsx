/**
 * GuideSpotlight render unit test (#1178 / ADR-0058)。
 *
 * 確認項目:
 * 1. visible + targetRect で title / body / dismiss が描画される
 * 2. targetRect=null (計測前) / visible=false では何も描画しない
 * 3. dismiss tap → onDismiss、強調領域 tap → onTargetPress (未指定なら onDismiss)
 */
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import { GuideSpotlight } from '@/src/features/guides/GuideSpotlight';

const RECT = { x: 100, y: 700, width: 200, height: 48 };

describe('GuideSpotlight (#1178)', () => {
  test('visible + targetRect → title / body / dismiss ラベルが描画される', () => {
    const { getByText, getByTestId } = render(
      <GuideSpotlight
        visible
        targetRect={RECT}
        title="タイトル"
        body="本文の案内"
        dismissLabel="あとで"
        onDismiss={jest.fn()}
      />,
    );
    expect(getByTestId('e2e_guide_spotlight')).toBeTruthy();
    expect(getByText('タイトル')).toBeTruthy();
    expect(getByText('本文の案内')).toBeTruthy();
    expect(getByText('あとで')).toBeTruthy();
  });

  test('targetRect=null (計測前) では何も描画しない', () => {
    const { queryByTestId } = render(
      <GuideSpotlight
        visible
        targetRect={null}
        body="本文"
        dismissLabel="OK"
        onDismiss={jest.fn()}
      />,
    );
    expect(queryByTestId('e2e_guide_spotlight')).toBeNull();
  });

  test('visible=false では何も描画しない', () => {
    const { queryByTestId } = render(
      <GuideSpotlight
        visible={false}
        targetRect={RECT}
        body="本文"
        dismissLabel="OK"
        onDismiss={jest.fn()}
      />,
    );
    expect(queryByTestId('e2e_guide_spotlight')).toBeNull();
  });

  test('dismiss tap → onDismiss / 強調領域 tap → onTargetPress', () => {
    const onDismiss = jest.fn();
    const onTargetPress = jest.fn();
    const { getByTestId } = render(
      <GuideSpotlight
        visible
        targetRect={RECT}
        body="本文"
        dismissLabel="OK"
        onDismiss={onDismiss}
        onTargetPress={onTargetPress}
      />,
    );
    fireEvent.press(getByTestId('e2e_guide_spotlight_dismiss'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    fireEvent.press(getByTestId('e2e_guide_spotlight_target'));
    expect(onTargetPress).toHaveBeenCalledTimes(1);
  });

  test('onTargetPress 未指定なら強調領域 tap も onDismiss', () => {
    const onDismiss = jest.fn();
    const { getByTestId } = render(
      <GuideSpotlight
        visible
        targetRect={RECT}
        body="本文"
        dismissLabel="OK"
        onDismiss={onDismiss}
      />,
    );
    fireEvent.press(getByTestId('e2e_guide_spotlight_target'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
