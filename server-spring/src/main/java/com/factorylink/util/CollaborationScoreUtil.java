package com.factorylink.util;

import com.factorylink.entity.Company;

/** 클라이언트 {@code collaborationScore.js}와 동일한 MVP 점수. */
public final class CollaborationScoreUtil {

  private CollaborationScoreUtil() {}

  public static int score(long myCompanyId, Company my, Company other) {
    if (my == null || other == null || other.getId() == null || other.getId().equals(myCompanyId)) {
      return -1;
    }
    double s = 0.42;
    if (other.getRegion() != null && other.getRegion().equals(my.getRegion())) {
      s += 0.28;
    }
    String a = my.getType();
    String b = other.getType();
    if ("BUYER".equals(a) && ("SELLER".equals(b) || "BOTH".equals(b))) {
      s += 0.18;
    } else if ("SELLER".equals(a) && ("BUYER".equals(b) || "BOTH".equals(b))) {
      s += 0.18;
    } else if ("BOTH".equals(a) && "BOTH".equals(b)) {
      s += 0.1;
    } else if ("BOTH".equals(a)) {
      s += 0.08;
    }
    long noise =
        ((other.getId() * 7919L + (myCompanyId != 0 ? myCompanyId : 1L) * 104729L) % 7);
    s += noise / 100.0;
    return Math.min(98, (int) Math.round(s * 100));
  }
}
